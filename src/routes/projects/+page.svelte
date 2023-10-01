<script lang="ts">
    import Writing from '@components/app/Writing.svelte';
    import Header from '@components/app/Header.svelte';
    import {
        Galleries,
        Projects,
        archivedProjects,
        editableProjects,
        locale,
        locales,
    } from '@db/Database';
    import ProjectPreviewSet from '@components/app/ProjectPreviewSet.svelte';
    import { goto } from '$app/navigation';
    import Button from '@components/widgets/Button.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import GalleryPreview from '@components/app/GalleryPreview.svelte';
    import { getUser } from '@components/project/Contexts';
    import Feedback from '@components/app/Feedback.svelte';
    import { get } from 'svelte/store';
    import Subheader from '@components/app/Subheader.svelte';
    import { EDIT_SYMBOL } from '../../parser/Symbols';
    import getProjectLink from '../../components/app/getProjectLink';

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

    // Whether to show an error
    let deleteError = false;
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
        edit={{
            description: $locale.ui.page.projects.button.editproject,
            action: (project) => goto(getProjectLink(project, false)),
            label: EDIT_SYMBOL,
        }}
        remove={(project) => {
            return {
                prompt: $locale.ui.page.projects.confirm.archive.prompt,
                description:
                    $locale.ui.page.projects.confirm.archive.description,
                action: () => Projects.archiveProject(project.id, true),
                label: '🗑️',
            };
        }}
    />
    <!-- If there are any archived projects, make an archived section. -->
    {#if $archivedProjects.length > 0}
        <Subheader>{$locale.ui.page.projects.archiveheader}</Subheader>
        <MarkupHtmlView markup={$locale.ui.page.projects.archiveprompt} />
        {#if $user === null}<Feedback
                >{$locale.ui.page.projects.error.nodeletes}</Feedback
            >{/if}
        {#if deleteError}
            <Feedback>{$locale.ui.page.projects.error.delete}</Feedback>
        {/if}
        <ProjectPreviewSet
            set={$archivedProjects}
            edit={{
                description: $locale.ui.page.projects.button.unarchive,
                action: (project) => Projects.archiveProject(project.id, false),
                label: '👆🏻',
            }}
            remove={(project) =>
                $user && project.owner === $user.uid
                    ? {
                          prompt: $locale.ui.page.projects.confirm.delete
                              .prompt,
                          description:
                              $locale.ui.page.projects.confirm.delete
                                  .description,
                          action: () => {
                              deleteError = false;
                              try {
                                  Projects.deleteProject(project.id);
                              } catch (error) {
                                  deleteError = true;
                                  console.error(error);
                              }
                          },
                          label: '⨉',
                      }
                    : false}
        />
    {/if}

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
            <Feedback>{$locale.ui.page.projects.error.nogalleryedits}</Feedback>
        {:else}
            {#each $galleries.values() as gallery}
                <GalleryPreview gallery={get(gallery)} />
            {/each}
        {/if}
    {:else}
        <Feedback>{$locale.ui.page.projects.error.nogalleryedits}</Feedback>
    {/if}
</Writing>

<style>
    .add {
        margin-left: calc(2 * var(--wordplay-spacing));
    }
</style>
