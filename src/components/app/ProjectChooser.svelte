<script lang="ts">
    import { goto } from '$app/navigation';
    import type Project from '../../models/Project';
    import { getProjects, getUser } from '../project/Contexts';
    import ConfirmButton from '../widgets/ConfirmButton.svelte';
    import { preferredTranslations } from '@translation/translations';
    import { examples, makeProject } from '../../examples/examples';
    import Lead from './Lead.svelte';
    import ProjectPreview from './ProjectPreview.svelte';
    import Button from '../widgets/Button.svelte';
    import { onMount } from 'svelte';

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
            $projects.setProjects([newProject]);
            changeProject(newProject);
        }
    }

    // Load all projects from the database.
    onMount(() => {
        if ($user) $projects.realtimeSyncRemote($user.uid);
    });

    /** Create some example projects */
    const exampleProjects = examples.map((example) => makeProject(example));
</script>

<div class="projects">
    {#each $projects.all() as project (project.id)}
        <ProjectPreview {project} action={() => changeProject(project)}
            ><ConfirmButton
                prompt={$preferredTranslations[0].ui.prompt.deleteProject}
                tip={$preferredTranslations[0].ui.tooltip.deleteProject}
                action={() => $projects.delete(project.id)}>⨉</ConfirmButton
            ></ProjectPreview
        >
    {/each}
    <div class="break" />
    <Button
        tip={$preferredTranslations[0].ui.tooltip.newProject}
        action={newProject}
        ><span style:font-size="xxx-large">+</span>
    </Button>
</div>
<Lead>examples</Lead>
<div class="projects">
    {#each exampleProjects as project (project.id)}
        <ProjectPreview {project} action={() => copyProject(project)} />
    {/each}
</div>

<style>
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

    .break {
        flex-basis: 100%;
        height: 0;
    }
</style>
