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
    import { Projects } from '@db/Database';
    import type Project from '@db/projects/Project';
    import {
        CANCEL_SYMBOL,
        COPY_SYMBOL,
        EDIT_SYMBOL,
    } from '../../parser/Symbols';
    import Fuse from 'fuse.js';

    const user = getUser();

    // Whether to show an error
    let deleteError = $state(false);
    
    // Search functionality
    let searchTerm = $state('');
    
    // Fuse.js configuration for fuzzy search
    const fuseOptions = {
        includeScore: true,
        threshold: 0.4, // 0.0 = exact match, 1.0 = match anything
        ignoreLocation: true, // Don't care where in string match occurs
        keys: ['name', 'files.name']
    };
    
    // Create searchable data structure for projects
    function createSearchableProjects(projects: Project[]) {
        return projects.map(project => ({
            project: project,
            name: project.getName(),
            files: project.getSources().map(source => ({
                name: source.getPreferredName($locales.getLocales())
            }))
        }));
    }
    
    // Search scope: project names and source file names with Fuse.js
    function searchInProjects(projects: Project[], searchTerm: string): Project[] {
        if (!searchTerm.trim()) return projects;
        
        const searchableProjects = createSearchableProjects(projects);
        const fuse = new Fuse(searchableProjects, fuseOptions);
        const results = fuse.search(searchTerm);
        
        // Return projects in order of best match
        return results.map(result => result.item.project);
    }

    let allOwnedProjects = $derived(
        Projects.allEditableProjects.filter(
            (p) => p.getOwner() === $user?.uid || !p.hasOwner(),
        )
    );

    let allSharedProjects = $derived(
        !isAuthenticated($user)
            ? []
            : Projects.allEditableProjects.filter(
                  (p) => p.hasOwner() && p.getOwner() !== $user.uid,
              )
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
        )
    );

    let owned: Project[] = $derived(
        searchInProjects(allOwnedProjects, searchTerm)
    );

    let shared: Project[] = $derived(
        searchInProjects(allSharedProjects, searchTerm)
    );

    // Include archived projects in search results
    let archived: Project[] = $derived(
        searchInProjects(allArchivedProjects, searchTerm)
    );
</script>

<svelte:head>
    <Title text={(l) => l.ui.page.projects.header} />
</svelte:head>

<Writing>
    <Header text={(l) => l.ui.page.projects.header} />
    <MarkupHTMLView markup={(l) => l.ui.page.projects.projectprompt} />
    
    <!-- Search Bar -->
    <div class="search-container">
        <TextField
            id="project-search"
            bind:text={searchTerm}
            placeholder="🔍 Search projects and files"
            description={(l) => l.ui.page.projects.search.description}
            fill={true}
        />
    </div>
    
    
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

    {#if searchTerm.trim() && owned.length === 0 && shared.length === 0 && archived.length === 0}
        <Notice>
            <div class="no-results">
                <p class="no-results-message">
                    No projects found for "<strong>{searchTerm}</strong>"
                </p>
                <p class="no-results-suggestion">
                    Try checking your spelling or using different keywords. Our search is forgiving of typos, but you might want to try a shorter search term.
                </p>
            </div>
        </Notice>
    {:else}
        <ProjectPreviewSet
            set={owned}
            searchTerm={searchTerm}
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
    {/if}

    <!-- If there are any shared projects, make a shared section. -->
    {#if shared.length + commenterViewerProjects.length > 0}
        <Subheader text={(l) => l.ui.page.projects.subheader.shared} />
        <ProjectPreviewSet
            set={shared.concat(commenterViewerProjects)}
            searchTerm={searchTerm}
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
            searchTerm={searchTerm}
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
    .add {
        margin-left: calc(2 * var(--wordplay-spacing));
    }

    .search-container {
        margin: var(--wordplay-spacing) 0;
        padding: 0 calc(2 * var(--wordplay-spacing));
    }

    .no-results {
        text-align: center;
    }

    .no-results-message {
        font-size: 1.1em;
        margin-bottom: var(--wordplay-spacing);
        color: var(--wordplay-background);
    }

    .no-results-suggestion {
        font-size: 0.9em;
        line-height: 1.4;
        color: var(--wordplay-background);
    }
</style>
