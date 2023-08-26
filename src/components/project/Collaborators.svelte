<script lang="ts">
    import { DB, Projects, locale } from '../../db/Database';
    import validateEmail from '../../db/validEmail';
    import type Project from '../../models/Project';
    import Feedback from '../app/Feedback.svelte';
    import Spinning from '../app/Spinning.svelte';
    import Button from '../widgets/Button.svelte';
    import Dialog from '../widgets/Dialog.svelte';
    import TextField from '../widgets/TextField.svelte';

    export let show: boolean;
    export let project: Project;

    let email = '';
    let adding = false;
    let unknown = false;

    async function add() {
        if (validateEmail(email)) {
            adding = true;
            const userID = await DB.getUserIDFromEmail(email);
            adding = false;
            if (userID === undefined) {
                unknown = true;
            } else {
                unknown = false;
                Projects.reviseProject(project.withUser(userID));
            }
        }
    }

    // Whenever the project changes, get it's user's email addresses
    let emails: Map<string, string | null> = new Map();
    $: if (show)
        DB.getEmailFromUserIDs(project.uids).then((map) => (emails = map));
</script>

<Dialog bind:show description={$locale.ui.dialog.collaborators}>
    <form class="form" on:submit={add}>
        <TextField
            bind:text={email}
            placeholder={$locale.ui.field.collaborator.placeholder}
            description={$locale.ui.field.collaborator.description}
            validator={validateEmail}
        />
        <Button
            tip={$locale.ui.page.login.submit}
            active={validateEmail(email)}
            action={() => undefined}>&gt;</Button
        >
        {#if adding}<Spinning />{/if}
        {#if unknown}<p
                ><Feedback inline>{$locale.ui.error.unknownEmail}</Feedback></p
            >{/if}
    </form>

    <div class="people">
        {#each project.uids as uid}
            <div class="person"
                ><span class="email"
                    >{#if emails.has(uid)}{emails.get(uid) ??
                            '?'}{:else}<Spinning />{/if}</span
                ><Button
                    tip={$locale.ui.button.removeCollaborator}
                    active={project.uids.length > 1}
                    action={() =>
                        Projects.reviseProject(project.withoutUser(uid))}
                    >⨉</Button
                ></div
            >
        {/each}
    </div>
</Dialog>

<style>
    .people {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin-top: calc(2 * var(--wordplay-spacing));
    }

    .person {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    p {
        margin-top: var(--wordplay-spacing);
    }
</style>
