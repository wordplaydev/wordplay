<script lang="ts">
    import { goto } from '$app/navigation';
    import AddProject from '@components/app/AddProject.svelte';
    import Header from '@components/app/Header.svelte';
    import Notice from '@components/app/Notice.svelte';
    import ProjectPreviewSet from '@components/app/ProjectPreviewSet.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import Title from '@components/widgets/Title.svelte';
    import { Projects } from '@db/Database';
    import type Project from '@db/projects/Project';
    import {
        CANCEL_SYMBOL,
        COPY_SYMBOL,
        EDIT_SYMBOL,
    } from '../../parser/Symbols';

    const user = getUser();

    // Whether to show an error
    let deleteError = $state(false);

    let owned: Project[] = $derived(
        Projects.allEditableProjects.filter(
            (p) => p.getOwner() === $user?.uid || !p.hasOwner(),
        ),
    );

    let shared: Project[] = $derived(
        !isAuthenticated($user)
            ? []
            : Projects.allEditableProjects.filter(
                  (p) => p.hasOwner() && p.getOwner() !== $user.uid,
              ),
    );

    let commenterViewerProjects: Project[] = $state([]);

    $effect(() => {
        if (!isAuthenticated($user)) return;

        commenterViewerProjects = [...Projects.readonlyProjects.values()]
            .filter((project) => project !== undefined)
            .filter((project) => {
                return (
                    !project.isArchived() &&
                    (project.hasCommenter($user.uid) ||
                        project.hasViewer($user.uid))
                );
            });
    });
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
    {#if shared.length + commenterViewerProjects.length > 0}
        <Subheader text={(l) => l.ui.page.projects.subheader.shared} />
        <ProjectPreviewSet
            set={shared.concat(commenterViewerProjects)}
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
</Writing>
