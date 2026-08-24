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
    import ProjectFolder from '@components/app/ProjectFolder.svelte';
    import ProjectGroupControls from '@components/app/ProjectGroupControls.svelte';
    import type { ProjectInteraction } from '@components/app/projectControls';
    import { getAnnouncer } from '@components/project/Contexts';
    import {
        DB,
        LoadedProjects,
        Settings,
        authAttempted,
        locales,
        projectFolders,
        projectSort,
    } from '@db/Database';
    import type { ProjectSort } from '@db/settings/ProjectSortSetting';
    import { tick } from 'svelte';
    import { v4 as uuidv4 } from 'uuid';
    import {
        moveDestinations,
        nextDestination,
        nextFolderName,
        resolveFolders,
    } from './folders';
    import {
        describeCleared,
        describeCreation,
        describeDeletion,
        describeDestination,
        describeDisclosure,
        describeMove,
        describeProjectSelection,
        describeRename,
        describeSelection,
    } from './announcements';
    import { onMount } from 'svelte';
    import type Project from '@db/projects/Project';
    import type LocaleText from '@locale/LocaleText';
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

    // The owned section's tile controls, shared by the flat search view, every
    // folder, and the top level — three renderings of one list.
    const ownedEdit = {
        description: (l: LocaleText) => l.ui.page.projects.button.editproject,
        action: (project: Project) => localeGoto(project.getLink(false)),
        label: EDIT_SYMBOL,
    };
    const ownedCopy = {
        description: (l: LocaleText) => l.ui.project.button.remix.tip,
        action: async (project: Project) =>
            localeGoto((await DB.loadProjects()).remix(project).getLink(false)),
        label: REMIX_SYMBOL,
    };
    const ownedRemove = (project: Project) => {
        return {
            prompt: (l: LocaleText) =>
                l.ui.page.projects.confirm.archive.prompt,
            description: (l: LocaleText) =>
                l.ui.page.projects.confirm.archive.description,
            action: async () =>
                (await DB.loadProjects()).archiveProject(project.getID(), true),
            label: '🗑️',
        };
    };

    // ——— Folders ————————————————————————————————————————————————————————
    // Folder *membership* is a field on the project doc; the folders themselves
    // are creator settings. They're separate documents that sync independently,
    // which is why resolveFolders puts a project whose folder hasn't arrived
    // yet at the top level rather than hiding it.

    const announce = getAnnouncer();

    /**
     * What the creator has chosen, if anything: one folder, or one project.
     *
     * A single choice rather than two, because the controls that act on it are
     * different — a folder can be deleted, a project can be moved — and having
     * both at once would leave it ambiguous which one a keystroke meant.
     */
    type Choice =
        | { kind: 'folder'; id: string }
        | { kind: 'project'; id: string }
        | undefined;
    let choice: Choice = $state(undefined);

    /** Where a project being dragged would land. */
    let candidate: string | null = $state(null);

    let organized = $derived(
        resolveFolders(
            owned,
            $projectFolders,
            $projectSort,
            $locales.getLanguages(),
        ),
    );

    /** Folders can't be organized while a search is filtering the page: a
     *  destructive control must never act on state the creator can't see. */
    let searching = $derived(debouncedTerm.current.trim().length > 0);

    let chosenFolder = $derived.by(() => {
        const chosen = choice;
        return chosen?.kind === 'folder'
            ? organized.folders.find((f) => f.id === chosen.id)
            : undefined;
    });

    /** Focus a widget by the data-uiid it was given. Widgets don't take an
     *  `id`, and focus has to be restored by identity rather than by position:
     *  the tile that was just moved re-renders under a different folder. */
    function focusUIID(uiid: string) {
        const element = document.querySelector(`[data-uiid="${uiid}"]`);
        if (element instanceof HTMLElement) element.focus();
    }

    function focusProject(id: string) {
        const element = document.querySelector(`[data-project="${id}"]`);
        if (element instanceof HTMLElement) element.focus();
    }

    function speak(message: string) {
        if (announce && $announce)
            $announce('project-folder', $locales.getLanguages()[0], message);
    }

    function folderNameOf(id: string | null): string | undefined {
        return id === null ? undefined : $projectFolders[id]?.name;
    }

    async function createFolder() {
        const id = uuidv4();
        const name = nextFolderName(
            $projectFolders,
            $locales.getPrimaryPlainText(
                (l) => l.ui.page.projects.folder.name.placeholder,
            ),
        );
        Settings.setProjectFolder(id, { name, collapsed: false });
        choice = { kind: 'folder', id };
        speak(describeCreation($locales, name));
        // Land in the new folder's name field: a folder made and left unnamed
        // is the same folder as the next one made and left unnamed.
        await tick();
        const field = document.querySelector(`[data-id="folder-name-${id}"]`);
        if (field instanceof HTMLElement) field.focus();
    }

    /** Delete a folder and archive what was in it. Archive rather than delete:
     *  the page's own 🗑 archives, so this is the same promise, and the work
     *  stays recoverable from the archived section below. */
    async function deleteFolder() {
        const folder = chosenFolder;
        if (folder === undefined) return;
        const projects = await DB.loadProjects();
        for (const project of folder.projects)
            await projects.archiveProject(project.getID(), true);
        Settings.removeProjectFolder(folder.id);
        choice = undefined;
        speak(describeDeletion($locales, folder.name, folder.projects.length));
        await tick();
        focusUIID('new-folder');
    }

    function toggleFolder(id: string) {
        const folder = $projectFolders[id];
        if (folder === undefined) return;
        const collapsed = !folder.collapsed;
        Settings.setProjectFolder(id, { ...folder, collapsed });
        const resolved = organized.folders.find((f) => f.id === id);
        speak(
            describeDisclosure(
                $locales,
                folder.name,
                resolved?.projects.length ?? 0,
                collapsed,
            ),
        );
    }

    /** Save a folder's new name, on a typing pause and on commit rather than on
     *  every keystroke. `TextField.changed` fires on input, so renaming wrote
     *  settings and queued a paced announcement per character — eight of each
     *  for "Homework", read back one after another. The unchanged check keeps
     *  whichever of the two fires second from repeating the work. */
    function renameFolder(id: string, name: string) {
        const folder = $projectFolders[id];
        if (folder === undefined || folder.name === name) return;
        Settings.setProjectFolder(id, { ...folder, name });
        speak(describeRename($locales, name));
    }

    function chooseFolder(id: string) {
        if (choice?.kind === 'folder' && choice.id === id) return;
        choice = { kind: 'folder', id };
        const folder = organized.folders.find((f) => f.id === id);
        if (folder)
            speak(
                describeSelection(
                    $locales,
                    folder.name,
                    folder.projects.length,
                ),
            );
    }

    function chooseProject(project: Project) {
        if (choice?.kind === 'project' && choice.id === project.getID()) return;
        choice = { kind: 'project', id: project.getID() };
        speak(describeProjectSelection($locales, project.getName()));
    }

    function clearChoice() {
        if (choice === undefined) return;
        choice = undefined;
        speak(describeCleared($locales));
    }

    /**
     * Move a chosen project one step through the folders.
     *
     * Up and down rather than left and right because the folders are stacked
     * vertically: the key points the way the project actually travels. Each
     * press commits, so there is no mode to enter, forget, or leave.
     */
    async function moveProject(project: Project, forward: boolean) {
        const destinations = moveDestinations(organized.folders);
        const destination = nextDestination(
            destinations,
            project.getFolder(),
            forward ? 'ArrowRight' : 'ArrowLeft',
            // The list runs top to bottom in every locale, so this walk is
            // never mirrored the way an inline one would be.
            false,
        );
        if (destination === project.getFolder()) return;
        (await DB.loadProjects()).reviseProject(
            project.withFolder(destination),
        );
        speak(
            describeMove(
                $locales,
                project.getName(),
                folderNameOf(destination),
            ),
        );
        // The tile re-renders under a different {#each}; put focus back on it
        // rather than dropping it to the document, so the next press lands.
        await tick();
        focusProject(project.getID());
    }

    function projectKey(event: KeyboardEvent, project: Project) {
        if (event.key === 'Escape') {
            event.preventDefault();
            clearChoice();
            return;
        }
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            // Choosing and moving are the same gesture from the keyboard:
            // arrowing on a focused tile is unambiguous about what it means.
            chooseProject(project);
            moveProject(project, event.key === 'ArrowDown');
        }
    }

    /**
     * Dragging a project onto a folder.
     *
     * The grab region is the tile itself, minus its link and buttons — there is
     * no handle, because a handle is a pointer-only affordance and the arrows
     * above already do this without one.
     */
    let dragging: string | null = $state(null);
    /** Where the pointer went down, so a press can be told from a drag. */
    let dragOrigin: { x: number; y: number } | undefined = $state(undefined);
    let dragPointer: string | null = null;
    let longPressTimer: ReturnType<typeof setTimeout> | undefined = undefined;

    /** Matches the editor's node dragging, so the two gestures feel the same. */
    const DRAG_THRESHOLD_PX = 10;
    const LONG_PRESS_MS = 250;
    const LONG_PRESS_DRIFT_PX = 5;

    function clearLongPress() {
        if (longPressTimer !== undefined) {
            clearTimeout(longPressTimer);
            longPressTimer = undefined;
        }
    }

    function grabProject(event: PointerEvent, project: Project) {
        dragPointer = project.getID();
        dragOrigin = { x: event.clientX, y: event.clientY };
        candidate = project.getFolder();
        // A touch drag would otherwise fight the page's own scrolling, so touch
        // waits for a hold — the same bargain the editor strikes for nodes.
        if (event.pointerType === 'touch') {
            clearLongPress();
            longPressTimer = setTimeout(() => {
                longPressTimer = undefined;
                dragging = project.getID();
            }, LONG_PRESS_MS);
        }
    }

    function dragMove(event: PointerEvent) {
        if (dragPointer === null || dragOrigin === undefined) return;
        const distance = Math.sqrt(
            Math.pow(event.clientX - dragOrigin.x, 2) +
                Math.pow(event.clientY - dragOrigin.y, 2),
        );
        // A finger that drifts during the hold is scrolling, not dragging.
        if (longPressTimer !== undefined && distance >= LONG_PRESS_DRIFT_PX) {
            clearLongPress();
            dragPointer = null;
            dragOrigin = undefined;
            return;
        }
        if (dragging === null) {
            if (event.pointerType === 'touch') return;
            if (distance < DRAG_THRESHOLD_PX) return;
            dragging = dragPointer;
        }
        const over = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest('[data-folder]');
        const folder = over?.getAttribute('data-folder') ?? null;
        const destination = folder === 'none' ? null : folder;
        if (destination === candidate) return;
        candidate = destination;
        const project = owned.find((p) => p.getID() === dragging);
        if (project && announce && $announce)
            $announce(
                'project-move',
                $locales.getLanguages()[0],
                describeDestination(
                    $locales,
                    project.getName(),
                    folderNameOf(candidate),
                ),
            );
    }

    async function dropProject() {
        clearLongPress();
        const id = dragging;
        const destination = candidate;
        dragging = null;
        dragPointer = null;
        dragOrigin = undefined;
        candidate = null;
        if (id === null) return;
        const project = owned.find((p) => p.getID() === id);
        // A drop where the project already was changes nothing, and silence is
        // the signal for no change.
        if (project === undefined || destination === project.getFolder())
            return;
        (await DB.loadProjects()).reviseProject(
            project.withFolder(destination),
        );
        speak(
            describeMove(
                $locales,
                project.getName(),
                folderNameOf(destination),
            ),
        );
    }

    /** How every project tile on this page takes part in choosing and moving. */
    const interaction: ProjectInteraction = {
        selected: (project) =>
            choice?.kind === 'project' && choice.id === project.getID(),
        select: (project) => chooseProject(project),
        key: (event, project) => projectKey(event, project),
        grab: (event, project) => grabProject(event, project),
    };

    // This page reads projects straight away, so ask for them rather than
    // waiting for the layout's idle warm-up.
    onMount(() => void DB.startProjectWork());
</script>

<svelte:head>
    <Title text={(l) => l.ui.page.projects.header} />
</svelte:head>

<svelte:window
    onpointermove={dragMove}
    onpointerup={dropProject}
    onpointercancel={dropProject}
/>

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
        <ProjectGroupControls
            sort={$projectSort}
            setSort={(sort: ProjectSort) => Settings.setProjectSort(sort)}
            create={createFolder}
            remove={deleteFolder}
            enabled={!searching}
            selected={chosenFolder !== undefined}
        />
    </div>

    <!-- At the head of the list rather than in the toolbar: a control that adds
         to a list belongs with the list, not with the controls that filter and
         order it. -->
    <div class="add">
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
    {:else if searching}
        <!-- Search flattens folders. A match hidden inside a collapsed folder
             would make search lie about what's there, so while a term is
             active every result is shown at one level, each labeled with the
             folder it actually lives in. -->
        <ProjectPreviewSet
            set={owned}
            sort={$projectSort}
            searchTerm={debouncedTerm.current}
            matchTexts={ownedMatchTexts}
            folderName={(project) => folderNameOf(project.getFolder())}
            edit={ownedEdit}
            copy={ownedCopy}
            remove={ownedRemove}
            anonymize={false}
            showCollaborators={true}
        />
    {:else}
        <!-- Anything a pointer can do here has a key that does it too, and this
             is where those keys are named. Pointed at by the list itself, so a
             screen reader reads it on arrival rather than only if the reader
             happens to wander into it. -->
        <!-- `role="group"` so the description below has a host: aria-* on a
             roleless div maps to `generic`, which screen readers don't expose,
             and the reference dangled whenever there was nothing to organize. -->
        <div
            class="organization"
            role="group"
            aria-describedby={organized.folders.length > 0 ||
            organized.loose.length > 0
                ? 'organizing'
                : undefined}
        >
            {#each organized.folders as folder (folder.id)}
                <ProjectFolder
                    {folder}
                    selected={choice?.kind === 'folder' &&
                        choice.id === folder.id}
                    candidate={dragging !== null && candidate === folder.id}
                    sort={$projectSort}
                    select={() => chooseFolder(folder.id)}
                    toggle={() => toggleFolder(folder.id)}
                    rename={(name) => renameFolder(folder.id, name)}
                    {interaction}
                    edit={ownedEdit}
                    copy={ownedCopy}
                    remove={ownedRemove}
                />
            {/each}
            <!-- The top level is a drop target of its own, so a project can be
                 dragged out of a folder as well as into one. -->
            <div
                data-folder="none"
                class="loose"
                class:candidate={dragging && candidate === null}
            >
                <ProjectPreviewSet
                    set={organized.loose}
                    sort={$projectSort}
                    {interaction}
                    edit={ownedEdit}
                    copy={ownedCopy}
                    remove={ownedRemove}
                    anonymize={false}
                    showCollaborators={true}
                />
            </div>
        </div>
        {#if organized.folders.length > 0 || organized.loose.length > 0}
            <div id="organizing" class="instructions">
                <MarkupHTMLView
                    markup={choice === undefined
                        ? (l) => l.ui.page.projects.folder.instructions.none
                        : choice.kind === 'folder'
                          ? (l) => l.ui.page.projects.folder.instructions.folder
                          : (l) =>
                                l.ui.page.projects.folder.instructions.project}
                />
            </div>
        {/if}
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
        flex-direction: row;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--wordplay-spacing);
        margin-block-start: calc(2 * var(--wordplay-spacing));
        margin-block-end: var(--wordplay-spacing);
    }

    /* Folders and the top level are sections of the page, not rows of a list,
       so they get the page's between-sections spacing rather than its
       within-a-component spacing. */
    .organization {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        margin-block-end: var(--wordplay-spacing);
    }

    .loose {
        padding: var(--wordplay-spacing);
        border: var(--wordplay-focus-width) solid transparent;
        border-radius: var(--wordplay-border-radius);
    }

    /* The top level as a drop target, matching the folders' solid outline. */
    .loose.candidate {
        border-color: var(--wordplay-highlight-color);
    }

    .add {
        margin-block-end: var(--wordplay-spacing);
    }

    .instructions {
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
