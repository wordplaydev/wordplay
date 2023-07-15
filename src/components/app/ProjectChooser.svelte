<script lang="ts">
    import { goto } from '$app/navigation';
    import type Project from '../../models/Project';
    import { getUser } from '../project/Contexts';
    import ConfirmButton from '../widgets/ConfirmButton.svelte';
    import { examples, makeProject } from '../../examples/examples';
    import Lead from './Lead.svelte';
    import ProjectPreview from './ProjectPreview.svelte';
    import Button from '../widgets/Button.svelte';
    import { PROJECT_PARAM_PLAY } from '../project/ProjectView.svelte';
    import { creator, projects } from '../../db/Creator';

    const user = getUser();

    function changeProject(example: Project, fullscreen: boolean = false) {
        goto(
            `/project/${example.id}${
                fullscreen ? `?${PROJECT_PARAM_PLAY}` : ''
            }`
        );
    }

    function newProject() {
        const newProjectID = $creator.createProject(
            $creator.getLocale(),
            $user ? $user.uid : undefined,
            "Phrase('🐈' rest: Sequence(sway() 1s))"
        );
        goto(`/project/${newProjectID}`);
    }

    function copyProject(project: Project) {
        let newProject = project.copy();
        if ($user) newProject = newProject.withUser($user.uid);
        $creator.addProject(newProject);
        changeProject(newProject);
    }

    function sortProjects(projects: Project[]): Project[] {
        return projects.sort((a, b) =>
            a.getName().localeCompare(b.getName(), $creator.getLanguages())
        );
    }

    /** Create some example projects */
    const exampleProjects = examples.map((example) =>
        makeProject(example, $creator.getNative())
    );
</script>

<Lead>{$creator.getLocale().ui.header.projects}</Lead>
<div class="projects">
    {#each sortProjects($projects
            .getCurrentProjects()
            .filter((p) => p.listed)) as project (project.id)}
        <ProjectPreview {project} action={() => changeProject(project, true)}
            ><div class="controls"
                ><Button
                    tip={$creator.getLocale().ui.tooltip.editProject}
                    action={() => changeProject(project)}>✎</Button
                ><ConfirmButton
                    prompt={$creator.getLocale().ui.prompt.deleteProject}
                    tip={$creator.getLocale().ui.tooltip.deleteProject}
                    action={() => $creator.deleteProject(project.id)}
                    >⨉</ConfirmButton
                ></div
            ></ProjectPreview
        >
    {/each}
    <div class="break" />
    <Button tip={$creator.getLocale().ui.tooltip.newProject} action={newProject}
        ><span style:font-size="xxx-large">+</span>
    </Button>
</div>
<Lead>{$creator.getLocale().ui.header.examples}</Lead>
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

    .controls {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    .break {
        flex-basis: 100%;
        height: 0;
    }
</style>
