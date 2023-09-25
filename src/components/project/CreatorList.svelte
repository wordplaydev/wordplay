<!-- A modifiable list of creators -->
<script lang="ts">
    import type { Creator } from '../../db/CreatorDatabase';
    import { DB, locale } from '../../db/Database';
    import validateEmail from '../../db/validEmail';
    import CreatorView from '../app/CreatorView.svelte';
    import Feedback from '../app/Feedback.svelte';
    import Spinning from '../app/Spinning.svelte';
    import Button from '../widgets/Button.svelte';
    import TextField from '../widgets/TextField.svelte';

    export let uids: string[];
    export let add: (uid: string) => void;
    export let remove: (uid: string) => void;
    export let removable: (uid: string) => boolean;
    export let editable: boolean;
    export let anonymize: boolean;

    $: if (email) unknown = false;

    let adding = false;
    let email = '';
    let unknown = false;

    let creators: Record<string, Creator | null> = {};
    $: DB.Creators.getCreatorsByEmail(uids).then((map) => (creators = map));

    function validCollaborator(email: string) {
        // Don't add self
        return validateEmail(email) && email !== DB.getUserEmail();
    }

    async function addCreator() {
        if (validCollaborator(email)) {
            adding = true;
            const userID = await DB.Creators.getUID(email);
            adding = false;
            if (userID === null) {
                unknown = true;
            } else {
                unknown = false;
                add(userID);
            }
            email = '';
        }
    }
</script>

{#if editable}
    <form class="form" on:submit={addCreator}>
        <TextField
            bind:text={email}
            placeholder={$locale.ui.dialog.share.field.email.placeholder}
            description={$locale.ui.dialog.share.field.email.description}
            validator={validateEmail}
        />
        <Button
            tip={$locale.ui.dialog.share.button.submit}
            active={validCollaborator(email)}
            action={() => undefined}>&gt;</Button
        >
        {#if adding}<Spinning label="" />{/if}
        {#if unknown}<p
                ><Feedback inline
                    >{$locale.ui.dialog.share.error.unknown}</Feedback
                ></p
            >{/if}
    </form>
{/if}

<div class="people">
    {#each Object.entries(creators) as [uid, creator]}
        <div class="person"
            >{#if creator}<CreatorView
                    {anonymize}
                    {creator}
                />{:else}?{/if}{#if editable}<Button
                    tip={$locale.ui.project.button.removeCollaborator}
                    active={removable(uid)}
                    action={() => remove(uid)}>⨉</Button
                >{/if}</div
        >
    {/each}
</div>

<style>
    .people {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin-block-start: calc(2 * var(--wordplay-spacing));
        justify-content: center;
    }

    .person {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: center;
    }

    form {
        margin-block-start: calc(2 * var(--wordplay-spacing));
    }

    p {
        margin-top: var(--wordplay-spacing);
    }
</style>
