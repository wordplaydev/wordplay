<script lang="ts">
    import Lead from './Lead.svelte';
    import { database, locale, locales } from '../../db/Database';
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
        database.addOrUpdateProject(newProject, false, true);
        changeProject(newProject);
    }
</script>

<Lead>{$locale.ui.header.projects}</Lead>
<center
    ><Button tip={$locale.ui.description.newProject} action={newProject}
        ><span style:font-size="xxx-large">+</span>
    </Button></center
>
{#await database.getAllCreatorProjects()}
    …
{:then projects}
    <ProjectSet
        set={projects}
        previewAction={(project) => changeProject(project, true)}
        editAction={(project) => changeProject(project)}
    />
{:catch error}
    {error}
{/await}

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
