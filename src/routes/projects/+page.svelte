<script lang="ts">
    import { goto } from '$app/navigation';
    import AddProject from '@components/app/AddProject.svelte';
    import GalleryPreview from '@components/app/GalleryPreview.svelte';
    import Header from '@components/app/Header.svelte';
    import Notice from '@components/app/Notice.svelte';
    import ProjectPreviewSet from '@components/app/ProjectPreviewSet.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import Title from '@components/widgets/Title.svelte';
    import { Galleries, Projects, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import {
        CANCEL_SYMBOL,
        COPY_SYMBOL,
        EDIT_SYMBOL,
    } from '../../parser/Symbols';

    const user = getUser();

    let newGalleryError = $state(false);
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

    // Whether to show an error
    let deleteError = $state(false);

    let owned: Project[] = $derived(
        Projects.allEditableProjects.filter(
            (p) => p.getOwner() === $user?.uid || !p.hasOwner(),
        ),
    );

    let shared: Project[] = $derived(
        $user === null
            ? []
            : Projects.allEditableProjects.filter(
                  (p) => p.hasOwner() && p.getOwner() !== $user.uid,
              ),
    );
</script>

<svelte:head>
    <Title text={(l) => l.ui.page.projects.header} />
</svelte:head>

<Writing>
    <Header text={(l) => l.ui.page.projects.header} />
    <MarkupHTMLView markup={(l) => l.ui.page.projects.projectprompt} />
    <AddProject
        add={(template) => {
            const newProjectID = Projects.copy(
                template,
                $user?.uid ?? null,
                null,
            );
            goto(`/project/${newProjectID}`);
        }}
    />

    <ProjectPreviewSet
        set={owned}
        edit={{
            description: (l) => l.ui.page.projects.button.editproject,
            action: (project) => goto(project.getLink(false)),
            label: EDIT_SYMBOL,
        }}
        copy={{
            description: (l) => l.ui.project.button.duplicate,
            action: (project) =>
                goto(Projects.duplicate(project).getLink(false)),
            label: COPY_SYMBOL,
        }}
        remove={(project) => {
            return {
                prompt: (l) => l.ui.page.projects.confirm.archive.prompt,
                description: (l) =>
                    l.ui.page.projects.confirm.archive.description,
                action: () => Projects.archiveProject(project.getID(), true),
                label: '🗑️',
            };
        }}
        anonymize={false}
        showCollaborators={true}
    />

    <!-- If there are any shared projects, make a shared section. -->
    {#if shared.length > 0}
        <Subheader text={(l) => l.ui.page.projects.subheader.shared} />
        <ProjectPreviewSet
            set={shared}
            edit={{
                description: (l) => l.ui.page.projects.button.editproject,
                action: (project) => goto(project.getLink(false)),
                label: EDIT_SYMBOL,
            }}
            copy={{
                description: (l) => l.ui.project.button.duplicate,
                action: (project) =>
                    goto(Projects.duplicate(project).getLink(false)),
                label: COPY_SYMBOL,
            }}
            remove={() => false}
            anonymize={false}
            showCollaborators={true}
        />
    {/if}

    <!-- If there are any archived projects, make an archived section. -->
    {#if Projects.allArchivedProjects.length > 0}
        <Subheader text={(l) => l.ui.page.projects.subheader.archived} />
        <MarkupHTMLView markup={(l) => l.ui.page.projects.archiveprompt} />
        {#if $user === null}<Notice
                text={(l) => l.ui.page.projects.error.nodeletes}
            />{/if}
        {#if deleteError}
            <Notice text={(l) => l.ui.page.projects.error.delete} />
        {/if}
        <ProjectPreviewSet
            set={Projects.allArchivedProjects}
            edit={{
                description: (l) => l.ui.page.projects.button.unarchive,
                action: (project) =>
                    Projects.archiveProject(project.getID(), false),
                label: '↑🗑️',
            }}
            copy={false}
            anonymize={false}
            showCollaborators={true}
            remove={(project) =>
                $user && project.getOwner() === $user.uid
                    ? {
                          prompt: (l) =>
                              l.ui.page.projects.confirm.delete.prompt,
                          description: (l) =>
                              l.ui.page.projects.confirm.delete.description,
                          action: () => {
                              deleteError = false;
                              try {
                                  Projects.deleteProject(project.getID());
                              } catch (error) {
                                  deleteError = true;
                                  console.error(error);
                              }
                          },
                          label: CANCEL_SYMBOL,
                      }
                    : false}
        />
    {/if}

    <Header text={(l) => l.ui.page.projects.galleriesheader} />
    <MarkupHTMLView markup={(l) => l.ui.page.projects.galleryprompt} />
    {#if $user}
        <p class="add">
            <Button
                tip={(l) => l.ui.page.projects.button.newgallery}
                action={newGallery}
                icon="+"
                large
            ></Button></p
        >
        {#if newGalleryError}
            <Notice text={(l) => l.ui.page.projects.error.newgallery} />
        {/if}
        {#if Galleries.getStatus() === 'loading'}
            <Spinning label={(l) => l.ui.widget.loading.message} large />
        {:else if Galleries.getStatus() === 'noaccess'}
            <Notice text={(l) => l.ui.page.projects.error.noaccess} />
        {:else if Galleries.getStatus() === 'loggedout'}
            <Notice text={(l) => l.ui.page.projects.error.nogalleryedits} />
        {:else}
            {#each Galleries.accessibleGalleries.values() as gallery, index}
                <GalleryPreview {gallery} delay={index * 1000} />
            {/each}
        {/if}
    {:else}
        <Notice text={(l) => l.ui.page.projects.error.nogalleryedits} />
    {/if}
</Writing>

<style>
    .add {
        margin-left: calc(2 * var(--wordplay-spacing));
    }
</style>
