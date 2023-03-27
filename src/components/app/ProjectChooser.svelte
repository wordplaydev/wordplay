<script lang="ts">
    import { goto } from '$app/navigation';
    import type Project from '../../models/Project';
    import { getProjects, getUser } from '../project/Contexts';
    import ConfirmButton from '../widgets/ConfirmButton.svelte';
    import {
        preferredLanguages,
        preferredTranslations,
    } from '@translation/translations';
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
        const newProjectID = $projects.create(
            $preferredTranslations[0],
            $user ? $user.uid : undefined
        );
        goto(`/project/${newProjectID}`);
    }

    function copyProject(project: Project) {
        let newProject = project.copy();
        if ($user) newProject = newProject.withUser($user.uid);
        $projects.addProject(newProject);
        changeProject(newProject);
    }

    function sortProjects(projects: Project[]): Project[] {
        return projects.sort((a, b) =>
            a.getName().localeCompare(b.getName(), $preferredLanguages)
        );
    }

    /** Create some example projects */
    const exampleProjects = examples.map((example) => makeProject(example));
</script>

<Lead>{$preferredTranslations[0].ui.headers.projects}</Lead>
<div class="projects">
    {#each sortProjects($projects.all()) as project (project.id)}
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
<Lead>{$preferredTranslations[0].ui.headers.examples}</Lead>
<div class="projects">
    {#each sortProjects(exampleProjects) as project (project.id)}
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
