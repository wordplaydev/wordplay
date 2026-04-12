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
    import TextField from '@components/widgets/TextField.svelte';
    import Title from '@components/widgets/Title.svelte';
    import { locales, Projects } from '@db/Database';
    import type Project from '@db/projects/Project';
    import { searchProjects, type ProjectMatch } from './search';
    import {
        CANCEL_SYMBOL,
        COPY_SYMBOL,
        EDIT_SYMBOL,
    } from '../../parser/Symbols';

    const user = getUser();

    // Whether to show an error
    let deleteError = $state(false);

    // Search functionality
    let searchTerm = $state('');

    let allOwnedProjects = $derived(
        Projects.allEditableProjects.filter(
            (p) => p.getOwner() === $user?.uid || !p.hasOwner(),
        ),
    );

    let allSharedProjects = $derived(
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

    // Add archived projects to search scope
    let allArchivedProjects = $derived(
        Projects.allArchivedProjects.filter(
            (p) => p.getOwner() === $user?.uid || !p.hasOwner(),
        ),
    );

    let ownedMatches: ProjectMatch[] = $derived(
        searchProjects(allOwnedProjects, searchTerm, $locales),
    );
    let owned: Project[] = $derived(ownedMatches.map((m) => m.project));
    let ownedMatchTexts = $derived(
        new Map(
            ownedMatches
                .filter((m) => m.matchText !== undefined)
                .map((m) => [m.project.getID(), m.matchText!]),
        ),
    );

    let sharedMatches: ProjectMatch[] = $derived(
        searchProjects(allSharedProjects, searchTerm, $locales),
    );
    let shared: Project[] = $derived(sharedMatches.map((m) => m.project));
    let sharedMatchTexts = $derived(
        new Map(
            sharedMatches
                .filter((m) => m.matchText !== undefined)
                .map((m) => [m.project.getID(), m.matchText!]),
        ),
    );

    // Include archived projects in search results
    let archivedMatches: ProjectMatch[] = $derived(
        searchProjects(allArchivedProjects, searchTerm, $locales),
    );
    let archived: Project[] = $derived(archivedMatches.map((m) => m.project));
    let archivedMatchTexts = $derived(
        new Map(
            archivedMatches
                .filter((m) => m.matchText !== undefined)
                .map((m) => [m.project.getID(), m.matchText!]),
        ),
    );
</script>

<svelte:head>
    <Title text={(l) => l.ui.page.projects.header} />
</svelte:head>

<Writing>
    <Header text={(l) => l.ui.page.projects.header} />
    <MarkupHTMLView markup={(l) => l.ui.page.projects.projectprompt} />

    <div class="controls">
        <TextField
            id="project-search"
            bind:text={searchTerm}
            placeholder="🔍"
            description={(l) => l.ui.page.projects.search.description}
            max="10em"
        />

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
    </div>

    {#if searchTerm.trim() && owned.length === 0 && shared.length === 0 && archived.length === 0}
        <Notice
            testid="no-results-message"
            text={(l) => l.ui.page.projects.search.noResults}
        />
    {:else}
        <ProjectPreviewSet
            set={owned}
            {searchTerm}
            matchTexts={ownedMatchTexts}
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
                    action: () =>
                        Projects.archiveProject(project.getID(), true),
                    label: '🗑️',
                };
            }}
            anonymize={false}
            showCollaborators={true}
        />
    {/if}

    <!-- If there are any shared projects, make a shared section. -->
    {#if shared.length + commenterViewerProjects.length > 0}
        <Subheader text={(l) => l.ui.page.projects.subheader.shared} />
        <ProjectPreviewSet
            set={shared.concat(commenterViewerProjects)}
            {searchTerm}
            matchTexts={sharedMatchTexts}
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

    <!-- If there are archived projects in search results, show them -->
    {#if searchTerm.trim() && archived.length > 0}
        <Subheader text={(l) => l.ui.page.projects.subheader.archived} />
        <ProjectPreviewSet
            set={archived}
            {searchTerm}
            matchTexts={archivedMatchTexts}
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
                label: '↑',
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

<style>
    .controls {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin-block-end: var(--wordplay-spacing);
    }
</style>
