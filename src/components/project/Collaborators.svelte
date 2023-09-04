<script lang="ts">
    import { DB, Projects, locale } from '../../db/Database';
    import validateEmail from '../../db/validEmail';
    import type Project from '../../models/Project';
    import Feedback from '../app/Feedback.svelte';
    import Spinning from '../app/Spinning.svelte';
    import Subheader from '../app/Subheader.svelte';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import Button from '../widgets/Button.svelte';
    import Dialog from '../widgets/Dialog.svelte';
    import Mode from '../widgets/Mode.svelte';
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
    <Subheader
        >{$locale.ui.dialog.share.subheader.collaborators.header}</Subheader
    >
    <MarkupHtmlView
        markup={$locale.ui.dialog.share.subheader.collaborators.explanation}
    />
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

    <Subheader>{$locale.ui.dialog.share.subheader.public.header}</Subheader>
    <MarkupHtmlView
        markup={$locale.ui.dialog.share.subheader.public.explanation}
    />

    <MarkupHtmlView
        markup={Object.values($locale.rules)
            .map((promise) => `• ${promise}`)
            .join('\n\n')}
    />
    <p>
        <Mode
            descriptions={$locale.ui.dialog.share.mode.public}
            choice={project.public === true ? 1 : 0}
            select={(choice) =>
                Projects.reviseProject(project.asPublic(choice === 1))}
            modes={[
                '🤫 ' + $locale.ui.dialog.share.mode.public.modes[0],
                '🌐 ' + $locale.ui.dialog.share.mode.public.modes[1],
            ]}
        /></p
    >
    <MarkupHtmlView markup={$locale.ui.page.rights.consequences} />
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
