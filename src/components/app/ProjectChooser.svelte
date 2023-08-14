<script lang="ts">
    import Lead from './Lead.svelte';
    import { database, locale, locales, projects } from '../../db/Database';
    import ProjectSet from './ProjectPreviewSet.svelte';
    import { examples, makeProject } from '../../examples/examples';
    import type Project from '../../models/Project';
    import { goto } from '$app/navigation';
    import { PROJECT_PARAM_PLAY } from '../project/ProjectView.svelte';
    import Button from '../widgets/Button.svelte';
    import { getUser } from '../project/Contexts';

    const user = getUser();

    function newProject() {
        const newProjectID = database.createProject(
            $locales,
            $user ? $user.uid : undefined,
            $locale.newProject
        );
        goto(`/project/${newProjectID}`);
    }

    function changeProject(example: Project, fullscreen = false) {
        goto(
            `/project/${example.id}${
                fullscreen ? `?${PROJECT_PARAM_PLAY}` : ''
            }`
        );
    }

    function copyProject(project: Project) {
        let newProject = project.copy();
        if ($user) newProject = newProject.withUser($user.uid);
        database.addProject(newProject);
        changeProject(newProject);
    }
</script>

<Lead>{$locale.ui.header.projects}</Lead>
<ProjectSet
    set={$projects.getCurrentProjects()}
    previewAction={(project) => changeProject(project, true)}
    editAction={(project) => changeProject(project)}
/>

<Button tip={$locale.ui.description.newProject} action={newProject}
    ><span style:font-size="xxx-large">+</span>
</Button>

<Lead>{$locale.ui.header.examples}</Lead>
{#await Promise.all(examples.map((example) => makeProject(example)))}
    …
{:then projects}<ProjectSet
        set={projects}
        previewAction={(project) => copyProject(project)}
    />
{:catch error}
    :( {error}
{/await}
