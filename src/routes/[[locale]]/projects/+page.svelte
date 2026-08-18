<script lang="ts">
    import { browser } from '$app/environment';
    import AddProject from '@components/app/AddProject.svelte';
    import Notice from '@components/app/Notice.svelte';
    import PageHeader from '@components/app/PageHeader.svelte';
    import PreviewPlaceholder from '@components/app/PreviewPlaceholder.svelte';
    import ProjectPreviewSet from '@components/app/ProjectPreviewSet.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Writing from '@components/app/Writing.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getUser, isAuthenticated } from '@components/project/Contexts';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Title from '@components/widgets/Title.svelte';
    import { DB, LoadedProjects, authAttempted, locales } from '@db/Database';
    import { onMount } from 'svelte';
    import type Project from '@db/projects/Project';
    import { searchProjects, type ProjectMatch } from './search';
    import shouldExplainInstalledStorage from './installedStorage';
    import isStandalone from '@util/isStandalone';
    import { CANCEL_SYMBOL, EDIT_SYMBOL, REMIX_SYMBOL } from '@parser/Symbols';
    import { localeGoto } from '@util/localeGoto';
    import { debounced } from '@util/debounce.svelte';

    const user = getUser();

    // Whether to show an error
    let deleteError = $state(false);

    // Search functionality. The input updates `searchTerm` immediately; the
    // actual (AST-walking) search runs against a debounced copy.
    let searchTerm = $state('');
    const debouncedTerm = debounced(() => searchTerm);

    let allOwnedProjects = $derived(
        ($LoadedProjects?.allEditableProjects ?? []).filter(
            (p) => p.getOwner() === $user?.uid || !p.hasOwner(),
        ),
    );

    let allSharedProjects = $derived(
        !isAuthenticated($user)
            ? []
            : ($LoadedProjects?.allEditableProjects ?? []).filter(
                  (p) => p.hasOwner() && p.getOwner() !== $user.uid,
              ),
    );

    let commenterViewerProjects: Project[] = $state([]);

    /** Whether this is the installed app rather than a browser tab. Not reactive:
     *  a window doesn't become installed while it's open, and the gate below only
     *  reads it once the client has hydrated. */
    const standalone = isStandalone();

    /** Everything this creator has anywhere. Shared and read-only projects are
     *  necessarily empty in the signed-out case the notice is for, so the two
     *  the page owns are the whole count. */
    let projectCount = $derived(
        ($LoadedProjects?.allEditableProjects.length ?? 0) +
            ($LoadedProjects?.allArchivedProjects.length ?? 0),
    );

    let explainInstalledStorage = $derived(
        shouldExplainInstalledStorage({
            standalone,
            signedIn: isAuthenticated($user),
            hydrated: $LoadedProjects?.hydrated ?? false,
            projectCount,
        }),
    );

    $effect(() => {
        if (!isAuthenticated($user)) return;

        commenterViewerProjects = [
            ...($LoadedProjects?.readonlyProjects.values() ?? []),
        ]
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
        ($LoadedProjects?.allArchivedProjects ?? []).filter(
            (p) => p.getOwner() === $user?.uid || !p.hasOwner(),
        ),
    );

    let ownedMatches: ProjectMatch[] = $derived(
        searchProjects(allOwnedProjects, debouncedTerm.current, $locales),
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
        searchProjects(allSharedProjects, debouncedTerm.current, $locales),
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
        searchProjects(allArchivedProjects, debouncedTerm.current, $locales),
    );
    let archived: Project[] = $derived(archivedMatches.map((m) => m.project));
    let archivedMatchTexts = $derived(
        new Map(
            archivedMatches
                .filter((m) => m.matchText !== undefined)
                .map((m) => [m.project.getID(), m.matchText!]),
        ),
    );

    // This page reads projects straight away, so ask for them rather than
    // waiting for the layout's idle warm-up.
    onMount(() => void DB.startProjectWork());
</script>

<svelte:head>
    <Title text={(l) => l.ui.page.projects.header} />
</svelte:head>

<Writing wide>
    <PageHeader
        header={(l) => l.ui.page.projects.header}
        description={(l) => l.ui.page.projects.projectprompt}
    />

    <!-- An installed app's projects live in a container separate from the
         browser's, so an empty page here is otherwise indistinguishable from
         lost work. See installedStorage.ts. -->
    {#if explainInstalledStorage}
        <Notice
            testid="installed-storage-message"
            text={(l) => l.ui.page.projects.installedprompt}
        />
    {/if}

    <div class="controls">
        <TextField
            id="project-search"
            bind:text={searchTerm}
            placeholder="🔍"
            description={(l) => l.ui.page.projects.search.description}
            max="10em"
        />

        <!-- Gate on `authAttempted` rather than `$user !== undefined`: when no
             Firebase Auth is configured the user store is never set at all, and
             a `$user === undefined` gate would hide the button forever. -->
        <AddProject
            ready={$authAttempted}
            add={async (template) => {
                const newProjectID = (await DB.loadProjects()).copy(
                    template,
                    $user?.uid ?? null,
                    null,
                );
                localeGoto(`/project/${newProjectID}`);
            }}
        />
    </div>

    {#if !browser || !($LoadedProjects?.hydrated ?? false)}
        <!-- Show the placeholder where the project list will appear, so the
             user has feedback instead of staring at an empty page during the
             gap between mount and the first IndexedDB emission.

             The `browser` check matters: there's no IndexedDB on the server, so
             `hydrate()` flips `hydrated` true immediately there and SSR would
             otherwise render an empty grid — a silent middle state before the
             client's placeholder appears. Treating the server render as
             not-yet-hydrated makes the first paint and the client's first state
             the same thing. -->
        <div class="loading" role="status">
            <PreviewPlaceholder />
            <LocalizedText path={(l) => l.ui.widget.loading.message} />
        </div>
    {:else if debouncedTerm.current.trim() && owned.length === 0 && shared.length === 0 && archived.length === 0}
        <Notice
            testid="no-results-message"
            text={(l) => l.ui.page.projects.search.noResults}
        />
    {:else}
        <ProjectPreviewSet
            set={owned}
            searchTerm={debouncedTerm.current}
            matchTexts={ownedMatchTexts}
            edit={{
                description: (l) => l.ui.page.projects.button.editproject,
                action: (project) => localeGoto(project.getLink(false)),
                label: EDIT_SYMBOL,
            }}
            copy={{
                description: (l) => l.ui.project.button.remix.tip,
                action: async (project) =>
                    localeGoto(
                        (await DB.loadProjects()).remix(project).getLink(false),
                    ),
                label: REMIX_SYMBOL,
            }}
            remove={(project) => {
                return {
                    prompt: (l) => l.ui.page.projects.confirm.archive.prompt,
                    description: (l) =>
                        l.ui.page.projects.confirm.archive.description,
                    action: async () =>
                        (await DB.loadProjects()).archiveProject(
                            project.getID(),
                            true,
                        ),
                    label: '🗑️',
                };
            }}
            anonymize={false}
            showCollaborators={true}
        />
    {/if}

    <!-- If there are any shared projects, make a shared section. -->
    {#if ($LoadedProjects?.hydrated ?? false) && shared.length + commenterViewerProjects.length > 0}
        <Subheader text={(l) => l.ui.page.projects.subheader.shared} />
        <ProjectPreviewSet
            set={shared.concat(commenterViewerProjects)}
            searchTerm={debouncedTerm.current}
            matchTexts={sharedMatchTexts}
            edit={{
                description: (l) => l.ui.page.projects.button.editproject,
                action: (project) => localeGoto(project.getLink(false)),
                label: EDIT_SYMBOL,
            }}
            copy={{
                description: (l) => l.ui.project.button.remix.tip,
                action: async (project) =>
                    localeGoto(
                        (await DB.loadProjects()).remix(project).getLink(false),
                    ),
                label: REMIX_SYMBOL,
            }}
            remove={() => false}
            anonymize={false}
            showCollaborators={true}
        />
    {/if}

    <!-- If there are archived projects in search results, show them -->
    {#if ($LoadedProjects?.hydrated ?? false) && debouncedTerm.current.trim() && archived.length > 0}
        <Subheader text={(l) => l.ui.page.projects.subheader.archived} />
        <ProjectPreviewSet
            set={archived}
            searchTerm={debouncedTerm.current}
            matchTexts={archivedMatchTexts}
            edit={{
                description: (l) => l.ui.page.projects.button.unarchive,
                action: async (project) =>
                    (await DB.loadProjects()).archiveProject(
                        project.getID(),
                        false,
                    ),
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
                          action: async () => {
                              deleteError = false;
                              try {
                                  (await DB.loadProjects()).deleteProject(
                                      project.getID(),
                                  );
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
    {#if ($LoadedProjects?.hydrated ?? false) && ($LoadedProjects?.allArchivedProjects.length ?? 0) > 0}
        <Subheader text={(l) => l.ui.page.projects.subheader.archived} />
        <MarkupHTMLView markup={(l) => l.ui.page.projects.archiveprompt} />
        {#if $user === null}<Notice
                text={(l) => l.ui.page.projects.error.nodeletes}
            />{/if}
        {#if deleteError}
            <Notice text={(l) => l.ui.page.projects.error.delete} />
        {/if}
        <ProjectPreviewSet
            set={$LoadedProjects?.allArchivedProjects ?? []}
            edit={{
                description: (l) => l.ui.page.projects.button.unarchive,
                action: async (project) =>
                    (await DB.loadProjects()).archiveProject(
                        project.getID(),
                        false,
                    ),
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
                          action: async () => {
                              deleteError = false;
                              try {
                                  (await DB.loadProjects()).deleteProject(
                                      project.getID(),
                                  );
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
        margin-block-start: var(--wordplay-spacing);
        margin-block-end: var(--wordplay-spacing);
    }

    .loading {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        padding-block: calc(var(--wordplay-spacing) * 2);
        color: var(--wordplay-inactive-color);
    }
</style>
