<script lang="ts">
    import Writing from '@components/app/Writing.svelte';
    import Header from '@components/app/Header.svelte';
    import {
        Galleries,
        Projects,
        editableProjects,
        locale,
        locales,
    } from '../../db/Database';
    import ProjectPreviewSet from '@components/app/ProjectPreviewSet.svelte';
    import { goto } from '$app/navigation';
    import Button from '@components/widgets/Button.svelte';
    import MarkupHtmlView from '../../components/concepts/MarkupHTMLView.svelte';
    import Spinning from '../../components/app/Spinning.svelte';
    import GalleryPreview from '../../components/app/GalleryPreview.svelte';
    import { getUser } from '../../components/project/Contexts';
    import Feedback from '../../components/app/Feedback.svelte';
    import { get } from 'svelte/store';

    const user = getUser();

    function newProject() {
        const newProjectID = Projects.create($locales, $locale.newProject);
        goto(`/project/${newProjectID}`);
    }

    let newGalleryError = false;
    async function newGallery() {
        newGalleryError = false;
        try {
            const newGalleryID = await Galleries.create($locale);
            goto(`/gallery/${newGalleryID}`);
        } catch (error) {
            console.error(error);
            newGalleryError = true;
        }
    }

    const status = Galleries.status;
    const galleries = Galleries.creatorGalleries;
</script>

<svelte:head>
    <title>{$locale.ui.page.projects.header}</title>
</svelte:head>

<Writing>
    <Header>{$locale.ui.page.projects.header}</Header>
    <MarkupHtmlView markup={$locale.ui.page.projects.projectprompt} />
    <p class="add">
        <Button
            tip={$locale.ui.page.projects.button.newproject}
            action={newProject}
            ><span style:font-size="xxx-large">+</span>
        </Button></p
    >
    <ProjectPreviewSet
        set={$editableProjects}
        remove={{
            prompt: $locale.ui.page.projects.confirm.archive.prompt,
            description: $locale.ui.page.projects.confirm.archive.description,
            action: (project) => Projects.archiveProject(project.id),
            label: '🗑️',
        }}
    />
    <Header>{$locale.ui.page.projects.galleriesheader}</Header>
    <MarkupHtmlView markup={$locale.ui.page.projects.galleryprompt} />
    {#if $user}
        <p class="add">
            <Button
                tip={$locale.ui.page.projects.button.newgallery}
                action={newGallery}
                ><span style:font-size="xxx-large">+</span>
            </Button></p
        >
        {#if newGalleryError}
            <Feedback>{$locale.ui.page.projects.error.newgallery}</Feedback>
        {/if}
        {#if $status === 'loading'}
            <Spinning label={$locale.ui.widget.loading.message} large />
        {:else if $status === 'noaccess'}
            <Feedback>{$locale.ui.page.projects.error.noaccess}</Feedback>
        {:else if $status === 'loggedout'}
            <Feedback>{$locale.ui.page.projects.error.loggedout}</Feedback>
        {:else}
            {#each $galleries.values() as gallery}
                <GalleryPreview gallery={get(gallery)} />
            {/each}
        {/if}
    {:else}
        <Feedback>{$locale.ui.page.projects.error.loggedout}</Feedback>
    {/if}
</Writing>

<style>
    .add {
        margin-left: calc(2 * var(--wordplay-spacing));
    }
</style>
