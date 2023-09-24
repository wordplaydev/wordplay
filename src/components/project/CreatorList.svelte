<!-- A modifiable list of creators -->
<script lang="ts">
    import { DB, locale } from '../../db/Database';
    import validateEmail from '../../db/validEmail';
    import Feedback from '../app/Feedback.svelte';
    import Spinning from '../app/Spinning.svelte';
    import Button from '../widgets/Button.svelte';
    import TextField from '../widgets/TextField.svelte';

    export let creators: string[];
    export let add: (uid: string) => void;
    export let remove: (uid: string) => void;
    export let removable: (uid: string) => boolean;
    export let editable: boolean;

    $: if (email) unknown = false;

    let adding = false;
    let email = '';
    let unknown = false;

    // Whenever the project changes, get it's user's email addresses
    let emails: Map<string, string | null> = new Map();

    $: DB.Creators.getEmailFromUserIDs(creators).then((map) => (emails = map));

    function validCollaborator(email: string) {
        // Don't add self
        return validateEmail(email) && email !== DB.getUserEmail();
    }

    async function addCreator() {
        if (validateEmail(email)) {
            adding = true;
            const userID = await DB.Creators.getUserIDFromEmail(email);
            adding = false;
            if (userID === undefined) {
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
    {#each creators as uid}
        <div class="person"
            ><span class="email"
                >{#if emails.has(uid)}{emails.get(uid) ?? '?'}{:else}<Spinning
                        label=""
                    />{/if}</span
            >{#if editable}<Button
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
    }

    .person {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    form {
        margin-block-start: calc(2 * var(--wordplay-spacing));
    }

    p {
        margin-top: var(--wordplay-spacing);
    }
</style>
