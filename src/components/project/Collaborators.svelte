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
                Projects.reviseProject(project.withCollaborator(userID));
            }
            email = '';
        }
    }

    // Whenever the project changes, get it's user's email addresses
    let emails: Map<string, string | null> = new Map();
    $: if (show)
        DB.getEmailFromUserIDs(project.collaborators).then(
            (map) => (emails = map)
        );
</script>

<Dialog bind:show description={$locale.ui.dialog.share}>
    <form class="form" on:submit={add}>
        <TextField
            bind:text={email}
            placeholder={$locale.ui.dialog.share.field.email.placeholder}
            description={$locale.ui.dialog.share.field.email.description}
            validator={validateEmail}
        />
        <Button
            tip={$locale.ui.dialog.share.button.submit}
            active={validateEmail(email)}
            action={() => undefined}>&gt;</Button
        >
        {#if adding}<Spinning label="" />{/if}
        {#if unknown}<p
                ><Feedback inline
                    >{$locale.ui.dialog.share.error.unknown}</Feedback
                ></p
            >{/if}
    </form>

    <div class="people">
        {#each project.collaborators as uid}
            <div class="person"
                ><span class="email"
                    >{#if emails.has(uid)}{emails.get(uid) ??
                            '?'}{:else}<Spinning label="" />{/if}</span
                ><Button
                    tip={$locale.ui.project.button.removeCollaborator}
                    active={project.collaborators.length > 0}
                    action={() =>
                        Projects.reviseProject(
                            project.withoutCollaborator(uid)
                        )}>⨉</Button
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
