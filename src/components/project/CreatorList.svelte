<!-- A modifiable list of creators -->
<script lang="ts">
    import isValidUsername from '@db/creators/isValidUsername';
    import type { Creator } from '../../db/creators/CreatorDatabase';
    import { DB, locales } from '../../db/Database';
    import validEmail from '../../db/creators/isValidEmail';
    import CreatorView from '../app/CreatorView.svelte';
    import Feedback from '../app/Feedback.svelte';
    import Spinning from '../app/Spinning.svelte';
    import Button from '../widgets/Button.svelte';
    import TextField from '../widgets/TextField.svelte';
    import { CANCEL_SYMBOL } from '@parser/Symbols';

    interface Props {
        uids: string[];
        add?: undefined | ((uid: string, emailOrUsername: string) => void);
        remove?: undefined | ((uid: string, emailOrUsername: string) => void);
        removable?: undefined | ((uid: string) => boolean);
        editable: boolean;
        anonymize: boolean;
        /** A uid by metadata list, if provided, it's rendered as a table instead. */
        metadata?: Map<string, string[]> | undefined;
        /** An optional function for adding a column before the given column number */
        addcolumn?: undefined | ((column: number) => void);
        /** An optional function for removing a column */
        removecolumn?: undefined | ((column: number) => void);
        /** A function for editing metadata */
        cell?:
            | undefined
            | ((uid: string, column: number, value: string) => void);
    }

    let {
        uids,
        add,
        remove,
        removable,
        editable,
        anonymize,
        metadata,
        cell,
        addcolumn,
        removecolumn,
    }: Props = $props();

    let adding = $state(false);
    let emailOrUsername = $state('');
    let unknown = $state(false);

    let creators: Record<string, Creator | null> = $state({});

    function validCollaborator(emailOrUsername: string) {
        // Don't add self
        return (
            (validEmail(emailOrUsername) || isValidUsername(emailOrUsername)) &&
            emailOrUsername !== DB.getUserEmail()
        );
    }

    async function addCreator() {
        if (validCollaborator(emailOrUsername)) {
            adding = true;
            const userID = await DB.Creators.getUID(emailOrUsername);
            adding = false;
            if (userID === null) {
                unknown = true;
            } else {
                unknown = false;
                if (add) add(userID, emailOrUsername);
                emailOrUsername = '';
            }
        }
    }

    // When the user changes, reset unknown.
    $effect(() => {
        if (emailOrUsername) unknown = false;
    });

    // Set the creators to whatever user IDs we have.
    $effect(() => {
        DB.Creators.getCreatorsByUIDs(uids).then((map) => (creators = map));
    });
</script>

{#snippet field()}
    {#if editable}
        <form class="form" onsubmit={addCreator}>
            <TextField
                bind:text={emailOrUsername}
                placeholder={$locales.get(
                    (l) => l.ui.dialog.share.field.emailOrUsername.placeholder,
                )}
                description={$locales.get(
                    (l) => l.ui.dialog.share.field.emailOrUsername.description,
                )}
                validator={validCollaborator}
            />
            <Button
                submit
                background
                padding={false}
                tip={$locales.get((l) => l.ui.dialog.share.button.submit)}
                active={validCollaborator(emailOrUsername)}
                action={() => undefined}>&gt;</Button
            >
            {#if adding}<Spinning label="" />{/if}
        </form>
    {/if}
{/snippet}

{#snippet removeButton(uid: string, email: string)}
    {#if editable && removable && remove}<Button
            tip={$locales.get((l) => l.ui.project.button.removeCollaborator)}
            active={removable(uid)}
            action={() => remove(uid, email)}>{CANCEL_SYMBOL}</Button
        >{/if}
{/snippet}

<!-- If metadata was provided, use a table and offer edits -->
{#if metadata}
    {@const columns = Array.from(metadata.values())[0]?.length ?? 0}
    <div class="column">
        <table>
            <thead>
                {#if addcolumn || removecolumn}
                    <tr>
                        <th></th>
                        {#each { length: columns } as _, index}
                            <th
                                >{#if addcolumn}<Button
                                        tip={$locales.get(
                                            (l) => l.ui.widget.table.addcolumn,
                                        )}
                                        action={() => addcolumn(index)}
                                        >+</Button
                                    >{/if}{#if removecolumn}<Button
                                        tip={$locales.get(
                                            (l) =>
                                                l.ui.widget.table.removecolumn,
                                        )}
                                        action={() => removecolumn(index)}
                                        >{CANCEL_SYMBOL}</Button
                                    >{/if}</th
                            >
                        {/each}
                        <th
                            >{#if addcolumn}
                                <Button
                                    tip={$locales.get(
                                        (l) => l.ui.widget.table.addcolumn,
                                    )}
                                    action={() => addcolumn(columns)}>+</Button
                                >
                            {/if}</th
                        >
                    </tr>
                {/if}
            </thead>
            <tbody>
                {#each Object.entries(creators) as [uid, creator]}
                    {@const info = metadata.get(uid)}
                    {#if creator}
                        <tr>
                            <td>
                                <CreatorView {anonymize} {creator} />
                            </td>
                            {#if info}
                                {#each info as datum, column}
                                    <td>
                                        {#if cell}
                                            <TextField
                                                text={datum}
                                                placeholder={$locales.get(
                                                    (l) =>
                                                        l.ui.widget.table.cell
                                                            .placeholder,
                                                )}
                                                description={$locales.get(
                                                    (l) =>
                                                        l.ui.widget.table.cell
                                                            .description,
                                                )}
                                                dwelled={(text) =>
                                                    cell(uid, column, text)}
                                            />
                                        {:else}
                                            {datum}
                                        {/if}
                                    </td>
                                {/each}
                                <td>
                                    {@render removeButton(
                                        uid,
                                        creator.getUsername(false),
                                    )}
                                </td>
                            {:else}
                                <td colspan="100"></td>
                            {/if}
                        </tr>
                    {/if}
                {/each}
            </tbody>
        </table>
        {@render field()}
    </div>
{:else}<div class="people">
        {#each Object.entries(creators) as [uid, creator]}
            <div class="person"
                >{#if creator}<CreatorView
                        {anonymize}
                        {creator}
                    />{:else}?{/if}{#if creator}{@render removeButton(
                        uid,
                        creator?.getUsername(false),
                    )}{/if}</div
            >
        {/each}
        {@render field()}
    </div>
{/if}
{#if unknown}
    <Feedback>{$locales.get((l) => l.ui.dialog.share.error.unknown)}</Feedback
    >{/if}

<style>
    .people {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        font-size: var(--wordplay-small-font-size);
    }

    .person {
        display: flex;
        flex-direction: row;
        gap: calc(var(--wordplay-spacing) / 2);
        align-items: center;
    }

    .form {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
    }

    .column {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    table {
        width: fit-content;
    }
</style>
