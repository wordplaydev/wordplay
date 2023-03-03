<script lang="ts">
    import Settings from '../settings/Settings.svelte';
    import { goto } from '$app/navigation';
    import type Project from '../../models/Project';
    import { getProjects, getUser } from '../project/Contexts';
    import ConfirmButton from '../widgets/ConfirmButton.svelte';
    import { preferredTranslations } from '@translation/translations';
    import { examples, makeProject } from '../../examples/examples';
    import Lead from './Lead.svelte';
    import ProjectPreview from './ProjectPreview.svelte';
    import Button from '../widgets/Button.svelte';

    const projects = getProjects();
    const user = getUser();

    function changeProject(example: Project) {
        goto(`/project/${example.id}`);
    }

    function newProject() {
        if ($user)
            goto(
                `/project/${$projects.create(
                    $preferredTranslations[0],
                    $user.uid
                )}`
            );
    }

    function copyProject(project: Project) {
        if ($user) {
            const newProject = project.copy().withUser($user.uid);
            $projects.addUnique([newProject]);
            changeProject(newProject);
        }
    }

    /** Create some example projects */
    const exampleProjects = examples.map((example) => makeProject(example));
</script>

<section class="chooser">
    <div class="projects">
        <Button
            tip={$preferredTranslations[0].ui.tooltip.newProject}
            action={newProject}
            ><span style:font-size="xxx-large">+</span>
        </Button>
        <div class="break" />
        {#each $projects.all() as project (project.id)}
            <ProjectPreview {project} action={() => changeProject(project)}
                ><ConfirmButton
                    prompt={$preferredTranslations[0].ui.prompt.deleteProject}
                    tip={$preferredTranslations[0].ui.tooltip.deleteProject}
                    action={() => $projects.delete(project.id)}>⨉</ConfirmButton
                ></ProjectPreview
            >
        {/each}
    </div>
    <Lead>examples</Lead>
    <div class="projects">
        {#each exampleProjects as project (project.id)}
            <ProjectPreview {project} action={() => copyProject(project)} />
        {/each}
    </div>
</section>
<div class="footer"><Settings /><a href="/">❌</a></div>

<style>
    .chooser {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--wordplay-spacing);
    }

    .projects {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: calc(2 * var(--wordplay-spacing));
        row-gap: calc(2 * var(--wordplay-spacing));
        justify-content: center;
    }

    .footer {
        position: fixed;
        bottom: var(--wordplay-spacing);
        right: calc(2 * var(--wordplay-spacing));
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .break {
        flex-basis: 100%;
        height: 0;
    }
</style>
