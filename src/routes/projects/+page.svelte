<script lang="ts">
    import Writing from '@components/app/Writing.svelte';
    import Header from '@components/app/Header.svelte';
    import {
        Galleries,
        Projects,
        archivedProjects,
        editableProjects,
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

    const user = getUser();

    function newProject() {
        const newProjectID = Projects.create(
            $locales.getLocales(),
            $locales.get((l) => l.newProject)
        );
        goto(`/project/${newProjectID}`);
    }

    let newGalleryError = false;
    async function newGallery() {
        newGalleryError = false;
        try {
            const newGalleryID = await Galleries.create($locales);
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
    <title>{$locales.get((l) => l.ui.page.projects.header)}</title>
</svelte:head>

<Writing>
    <Header>{$locales.get((l) => l.ui.page.projects.header)}</Header>
    <MarkupHtmlView
        markup={$locales.get((l) => l.ui.page.projects.projectprompt)}
    />
    <p class="add">
        <Button
            tip={$locales.get((l) => l.ui.page.projects.button.newproject)}
            action={newProject}
            ><span style:font-size="xxx-large">+</span>
        </Button></p
    >
    <ProjectPreviewSet
        set={$editableProjects}
        edit={{
            description: $locales.get(
                (l) => l.ui.page.projects.button.editproject
            ),
            action: (project) => goto(project.getLink(false)),
            label: EDIT_SYMBOL,
        }}
        remove={(project) => {
            return {
                prompt: $locales.get(
                    (l) => l.ui.page.projects.confirm.archive.prompt
                ),
                description: $locales.get(
                    (l) => l.ui.page.projects.confirm.archive.description
                ),
                action: () => Projects.archiveProject(project.getID(), true),
                label: '🗑️',
            };
        }}
    />
    <!-- If there are any archived projects, make an archived section. -->
    {#if $archivedProjects.length > 0}
        <Subheader
            >{$locales.get((l) => l.ui.page.projects.archiveheader)}</Subheader
        >
        <MarkupHtmlView
            markup={$locales.get((l) => l.ui.page.projects.archiveprompt)}
        />
        {#if $user === null}<Feedback
                >{$locales.get(
                    (l) => l.ui.page.projects.error.nodeletes
                )}</Feedback
            >{/if}
        {#if deleteError}
            <Feedback
                >{$locales.get(
                    (l) => l.ui.page.projects.error.delete
                )}</Feedback
            >
        {/if}
        <ProjectPreviewSet
            set={$archivedProjects}
            edit={{
                description: $locales.get(
                    (l) => l.ui.page.projects.button.unarchive
                ),
                action: (project) =>
                    Projects.archiveProject(project.getID(), false),
                label: '↑🗑️',
            }}
            remove={(project) =>
                $user && project.getOwner() === $user.uid
                    ? {
                          prompt: $locales.get(
                              (l) => l.ui.page.projects.confirm.delete
                          ).prompt,
                          description: $locales.get(
                              (l) => l.ui.page.projects.confirm.delete
                          ).description,
                          action: () => {
                              deleteError = false;
                              try {
                                  Projects.deleteProject(project.getID());
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

    <Header>{$locales.get((l) => l.ui.page.projects.galleriesheader)}</Header>
    <MarkupHtmlView
        markup={$locales.get((l) => l.ui.page.projects.galleryprompt)}
    />
    {#if $user}
        <p class="add">
            <Button
                tip={$locales.get((l) => l.ui.page.projects.button.newgallery)}
                action={newGallery}
                ><span style:font-size="xxx-large">+</span>
            </Button></p
        >
        {#if newGalleryError}
            <Feedback
                >{$locales.get(
                    (l) => l.ui.page.projects.error.newgallery
                )}</Feedback
            >
        {/if}
        {#if $status === 'loading'}
            <Spinning
                label={$locales.get((l) => l.ui.widget.loading.message)}
                large
            />
        {:else if $status === 'noaccess'}
            <Feedback
                >{$locales.get(
                    (l) => l.ui.page.projects.error.noaccess
                )}</Feedback
            >
        {:else if $status === 'loggedout'}
            <Feedback
                >{$locales.get(
                    (l) => l.ui.page.projects.error.nogalleryedits
                )}</Feedback
            >
        {:else}
            {#each $galleries.values() as gallery, index}
                <GalleryPreview gallery={get(gallery)} delay={index * 1000} />
            {/each}
        {/if}
    {:else}
        <Feedback
            >{$locales.get(
                (l) => l.ui.page.projects.error.nogalleryedits
            )}</Feedback
        >
    {/if}
</Writing>

<style>
    .add {
        margin-left: calc(2 * var(--wordplay-spacing));
    }
</style>
