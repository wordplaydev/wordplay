<script lang="ts">
    import Writing from '@components/app/Writing.svelte';
    import Header from '@components/app/Header.svelte';
    import {
        Projects,
        editableProjects,
        locale,
        locales,
    } from '../../db/Database';
    import ProjectPreviewSet from '@components/app/ProjectPreviewSet.svelte';
    import { goto } from '$app/navigation';
    import Button from '@components/widgets/Button.svelte';

    function newProject() {
        const newProjectID = Projects.create($locales, $locale.newProject);
        goto(`/project/${newProjectID}`);
    }
</script>

<svelte:head>
    <title>{$locale.ui.header.projects}</title>
</svelte:head>

<Writing>
    <Header>{$locale.ui.header.projects}</Header>
    <div class="add">
        <Button tip={$locale.ui.description.newProject} action={newProject}
            ><span style:font-size="xxx-large">+</span>
        </Button></div
    >
    <ProjectPreviewSet set={$editableProjects} editable />
</Writing>

<style>
    .add {
        margin: calc(4 * var(--wordplay-spacing));
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>
