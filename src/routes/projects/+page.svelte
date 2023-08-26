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
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';

    function newProject() {
        const newProjectID = Projects.create($locales, $locale.newProject);
        goto(`/project/${newProjectID}`);
    }
</script>

<svelte:head>
    <title>{$locale.ui.page.projects.header}</title>
</svelte:head>

<Writing>
    <Header>{$locale.ui.page.projects.header}</Header>
    <MarkupHtmlView markup={$locale.ui.page.projects.prompt} />
    <p class="add">
        <Button tip={$locale.ui.description.newProject} action={newProject}
            ><span style:font-size="xxx-large">+</span>
        </Button></p
    >
    <ProjectPreviewSet set={$editableProjects} editable />
</Writing>

<style>
    .add {
        margin-left: calc(2 * var(--wordplay-spacing));
    }
</style>
