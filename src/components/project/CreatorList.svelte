<!-- A modifiable list of creators -->
<script lang="ts">
    import isValidUsername from '@db/isValidUsername';
    import type { Creator } from '../../db/CreatorDatabase';
    import { DB, locales } from '../../db/Database';
    import validEmail from '../../db/isValidEmail';
    import CreatorView from '../app/CreatorView.svelte';
    import Feedback from '../app/Feedback.svelte';
    import Spinning from '../app/Spinning.svelte';
    import Button from '../widgets/Button.svelte';
    import TextField from '../widgets/TextField.svelte';
    import { CANCEL_SYMBOL } from '@parser/Symbols';

    interface Props {
        uids: string[];
        add?: undefined | ((uid: string) => void);
        remove?: undefined | ((uid: string) => void);
        removable?: undefined | ((uid: string) => boolean);
        editable: boolean;
        anonymize: boolean;
    }

    let { uids, add, remove, removable, editable, anonymize }: Props = $props();

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
                if (add) add(userID);
            }
            emailOrUsername = '';
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

<div class="people">
    {#each Object.entries(creators) as [uid, creator]}
        <div class="person"
            >{#if creator}<CreatorView
                    {anonymize}
                    {creator}
                />{:else}?{/if}{#if editable && removable && remove}<Button
                    tip={$locales.get(
                        (l) => l.ui.project.button.removeCollaborator,
                    )}
                    active={removable(uid)}
                    action={() => remove(uid)}>{CANCEL_SYMBOL}</Button
                >{/if}</div
        >
    {/each}
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
            {#if unknown}
                <Feedback
                    >{$locales.get(
                        (l) => l.ui.dialog.share.error.unknown,
                    )}</Feedback
                >{/if}
        </form>
    {/if}
</div>

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
    }
</style>
