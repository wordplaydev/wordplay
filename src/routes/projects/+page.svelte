<script lang="ts">
    import Writing from '@components/app/Writing.svelte';
    import Lead from '@components/app/Lead.svelte';
    import { database, locale, locales } from '../../db/Database';
    import ProjectPreviewSet from '@components/app/ProjectPreviewSet.svelte';
    import { goto } from '$app/navigation';
    import Button from '@components/widgets/Button.svelte';
    import gotoProject from '@components/app//gotoProject';
    import { getUser } from '../../components/project/Contexts';

    const user = getUser();

    function newProject() {
        const newProjectID = database.createProject(
            $locales,
            $user ? $user.uid : undefined,
            $locale.newProject
        );
        goto(`/project/${newProjectID}`);
    }
</script>

<svelte:head>
    <title>{$locale.ui.header.projects}</title>
</svelte:head>

<Writing>
    <Lead>{$locale.ui.header.projects}</Lead>
    <div class="add">
        <Button tip={$locale.ui.description.newProject} action={newProject}
            ><span style:font-size="xxx-large">+</span>
        </Button></div
    >
    {#await database.getAllCreatorProjects()}
        …
    {:then projects}
        <ProjectPreviewSet
            set={projects}
            previewAction={(project) => gotoProject(project, true)}
            editAction={(project) => gotoProject(project, false)}
        />
    {:catch error}
        {error}
    {/await}
</Writing>

<style>
    .add {
        margin: calc(4 * var(--wordplay-spacing));
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>
