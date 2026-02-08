<script module lang="ts">
    /** How long to wait until considering typing idle. */
    export const KeyboardIdleWaitTime = 1000;
</script>

<!-- svelte-ignore state_referenced_locally -->
<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import CollaborateView from '@components/app/chat/CollaborateView.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Documentation from '@components/concepts/Documentation.svelte';
    import GlyphChooser from '@components/editor/commands/GlyphChooser.svelte';
    import Highlight from '@components/editor/highlights/Highlight.svelte';
    import Menu from '@components/editor/menu/Menu.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import {
        getConceptFromURL,
        setConceptInURL,
    } from '@concepts/ConceptParams';
    import type Conflict from '@conflicts/Conflict';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import type Project from '@db/projects/Project';
    import {
        AnimationFactorIcons,
        AnimationFactors,
    } from '@db/settings/AnimationFactorSetting';
    import type Locale from '@locale/Locale';
    import Node, { isFieldPosition } from '@nodes/Node';
    import Source from '@nodes/Source';
    import { CANCEL_SYMBOL } from '@parser/Symbols';
    import { isName } from '@parser/Tokenizer';
    import Evaluator from '@runtime/Evaluator';
    import { onDestroy, onMount, tick, untrack } from 'svelte';
    import { writable, type Writable } from 'svelte/store';
    import type Concept from '../../concepts/Concept';
    import ConceptIndex from '../../concepts/ConceptIndex';
    import {
        animationFactor,
        arrangement,
        blocks,
        camera,
        Chats,
        Creators,
        DB,
        Galleries,
        HowTos,
        Locales,
        locales,
        mic,
        Projects,
        Settings,
    } from '../../db/Database';
    import { isFlagged } from '../../db/projects/Moderation';
    import Arrangement, { isResizeable } from '../../db/settings/Arrangement';
    import Characters from '../../lore/BasisCharacters';
    import type Color from '../../output/Color';
    import {
        PROJECT_PARAM_EDIT,
        PROJECT_PARAM_PLAY,
    } from '../../routes/project/constants';
    import type Value from '../../values/Value';
    import Annotations from '../annotations/Annotations.svelte';
    import CreatorView from '../app/CreatorView.svelte';
    import Emoji from '../app/Emoji.svelte';
    import {
        EnterFullscreen,
        ExitFullscreen,
        handleKeyCommand,
        Restart,
        ShowKeyboardHelp,
        VisibleModifyCommands,
        VisibleNavigateCommands,
        type CommandContext,
    } from '../editor/commands/Commands';

    import Toolbar from '@components/editor/commands/Toolbar.svelte';
    import Editor from '@components/editor/Editor.svelte';
    import type Gallery from '@db/galleries/Gallery';
    import GalleryHowTo from '@db/howtos/HowToDatabase.svelte';
    import type MenuInfo from '@edit/menu/Menu';
    import type { HighlightSpec } from '../editor/highlights/Highlights';
    import getOutlineOf, { getUnderlineOf } from '../editor/highlights/outline';
    import Timeline from '../evaluator/Timeline.svelte';
    import OutputView from '../output/OutputView.svelte';
    import type PaintingConfiguration from '../output/PaintingConfiguration';
    import Palette from '../palette/Palette.svelte';
    import Button from '../widgets/Button.svelte';
    import CommandButton from '../widgets/CommandButton.svelte';
    import ConfirmButton from '../widgets/ConfirmButton.svelte';
    import Dialog from '../widgets/Dialog.svelte';
    import TextField from '../widgets/TextField.svelte';
    import Toggle from '../widgets/Toggle.svelte';
    import type Bounds from './Bounds';
    import Checkpoints from './Checkpoints.svelte';
    import {
        getAnnouncer,
        getConceptPath,
        getFullscreen,
        getUser,
        IdleKind,
        isAuthenticated,
        setAnimatingNodes,
        setConceptIndex,
        setConflicts,
        setDragged,
        setEditors,
        setEvaluation,
        setKeyboardEditIdle,
        setKeyboardModifiers,
        setProjectCommandContext,
        setSelectedOutput,
        type ConceptPath,
        type EditorState,
        type KeyModifierState,
    } from './Contexts';
    import CopyButton from './CopyButton.svelte';
    import CurrentLayout from './CurrentLayout.svelte';
    import FullscreenIcon from './FullscreenIcon.svelte';
    import Layout from './Layout';
    import Moderation from './Moderation.svelte';
    import NonSourceTileToggle from './NonSourceTileToggle.svelte';
    import OutputLocaleChooser from './OutputLocaleChooser.svelte';
    import PositionAdjuster from './PositionAdjuster.svelte';
    import RootView from './RootView.svelte';
    import SelectedOutput from './SelectedOutput.svelte';
    import Separator from './Separator.svelte';
    import Sharing from './Sharing.svelte';
    import Shortcuts from './Shortcuts.svelte';
    import SourceTileToggle from './SourceTileToggle.svelte';
    import Tile, { TileKind, TileMode } from './Tile';
    import TileView, { type ResizeDirection } from './TileView.svelte';
    import Translate from './Translate.svelte';

    interface Props {
        project: Project;
        /** An optional original project to revert to */
        original?: Project | undefined;
        /** If false, then all things editable are deactivated */
        editable?: boolean;
        /** If true, only the output is shown in the initial layout. */
        showOutput?: boolean;
        /** True if the output should be fit to content */
        fit?: boolean;
        /** True if the project should focus the main editor source on mount */
        autofocus?: boolean;
        /** True if the project was overwritten by another instance of Wordplay */
        overwritten?: boolean;
        /** Show the guide if the project is empty */
        guide?: boolean;
        /** True if the moderation warnings should show */
        warn?: boolean;
        /** True if public dialog should show */
        shareable?: boolean;
        /** The node being dragged */
        dragged?: Node | undefined;
        /** The concept index used for this project */
        index?: ConceptIndex | undefined;
        /** Whether to persist the layout for layter */
        persistLayout?: boolean;
        /** If false and not collaborator, then collaborate panel is not shown */
        isCommenter?: boolean;
    }

    let {
        project,
        original = undefined,
        editable = true,
        showOutput = false,
        fit = true,
        autofocus = true,
        overwritten = false,
        guide = true,
        warn = true,
        shareable = true,
        dragged = $bindable(undefined),
        index = $bindable(undefined),
        persistLayout = true,
        isCommenter = false,
    }: Props = $props();

    // The HTMLElement that represents this element
    let view = $state<HTMLElement | undefined>(undefined);

    // The conflicts of interest in each editor, used to generate annotations.
    let conflictsOfInterest = $state<Map<Source, Conflict[]>>(new Map());

    /** Per-editor large deletion notifications */
    let largeDeletionNotifications = $state<Map<string, string | null>>(
        new Map(),
    );

    /** Function to set large deletion notification for a specific editor */
    function setLargeDeletionNotification(sourceID: string) {
        return (message: string | null) => {
            largeDeletionNotifications.set(sourceID, message);
            largeDeletionNotifications = new Map(largeDeletionNotifications);
        };
    }

    /** The latest menu generated by an editor */
    let menu = $state<MenuInfo | undefined>(undefined);

    /** The latest mouse position */
    let pointerX = $state(0);
    let pointerY = $state(0);

    /** The view that contains the dragged node */
    let dragContainer = $state<HTMLElement | undefined>(undefined);

    /** The outline to display under the dragged node */
    let outline = $state<HighlightSpec | undefined>(undefined);

    /** The current canvas */
    let canvas = $state<HTMLDivElement | undefined>();

    /** Whether to show the keyboard help dialog */
    let showHelpDialog = $state(false);

    /** The current canvas dimensions. Default to a value. */
    let canvasWidth = $state(1280);
    let canvasHeight = $state(800);

    /** The background color of the output, so we can make the tile match. */
    let outputBackground = $state<Color | string | null>(null);

    /** The current checkpoint chosen in the checkpoint chooser */
    let checkpoint = $state(-1);

    /** Whether the project is editable and viewing an older checkpoint */
    let editableAndCurrent = $derived(editable && checkpoint === -1);

    /** The new source recently added. Used to remember to keep it expanded initially. */
    let newSource = $state<Source | undefined>(undefined);

    /** Keep a source select, to decide what value is shown on stage */
    let selectedSourceIndex = $state(0);

    /** Keep the owner of the project around */
    let owner = $derived(project.getOwner());

    /** Keep track of the creator of the project */
    let creator = $state<Creator | null>(null);
    $effect(() => {
        if (owner) Creators.getCreator(owner).then((c) => (creator = c));
        else creator = null;
    });

    /** The current sources being viewed, either the project's source, or a checkpointed one */
    const sources = $derived(
        checkpoint >= 0
            ? project
                  .getCheckpoints()
                  [checkpoint].sources.map((s) => new Source(s.names, s.code))
            : project.getSources(),
    );

    /** The selected source is based on the index.*/
    const selectedSource = $derived(sources[selectedSourceIndex]);

    // Whether the project is in 'play' mode, dictated soley by a URL query parameter.
    let requestedPlay = $state(
        page.url.searchParams.get(PROJECT_PARAM_PLAY) !== null,
    );
    let requestedEdit = $state(
        page.url.searchParams.get(PROJECT_PARAM_EDIT) !== null,
    );

    const user = getUser();

    /** The fullscreen context of the page that this is in. */
    const pageFullscreen = getFullscreen();

    /** The live region announcer */
    const announce = getAnnouncer();

    /** Tell the parent Page whether we're in fullscreen so it can hide and color things appropriately. */
    $effect(() => {
        pageFullscreen?.set({
            // Don't turn on fullscreen if we were requested to show output.
            on: layout.isFullscreen() && !showOutput,
            // Only set a background if it's the stage that's in fullscreen
            background: layout.isStageFullscreen() ? outputBackground : null,
        });
    });

    /** Whether the browser is in fullscreen */
    let browserFullscreen = $state(false);

    /** The conflicts present in the current project. **/
    const conflicts = writable<Conflict[]>([]);
    setConflicts(conflicts);

    /** Keep the project in a store so we can derive other stores from it. */
    let projectStore = writable<Project>(project);
    $effect(() => {
        if ($projectStore !== project) projectStore.set(project);
    });

    /** Keep a project view global store indicating whether the creator is idle. */
    const keyboardEditIdle = writable<IdleKind>(IdleKind.Idle);
    setKeyboardEditIdle(keyboardEditIdle);

    let keyboardIdleTimeout = $state<NodeJS.Timeout | undefined>(undefined);

    /** Keep a project global store indicating modifier key state, so that controls can highlight themselves */
    const keyModifiers = writable<KeyModifierState>({
        control: false,
        alt: false,
        shift: false,
    });
    setKeyboardModifiers(keyModifiers);

    /** Keep a currently selected output locale to send to the Evaluator for evaluation and rendering */
    let evaluationLocale = $state<Locale | undefined>(undefined);

    /** Keep track of locales used */
    const localesUsed = $derived(project.getLocalesUsed());

    /** Keep a reactive map from source to EditorLocale chosen for the source */
    let editorLocales = $state<Record<string, Locale | null>>({});

    // When keyboard isn't idle, set a timeout to set it to idle later.
    // to reset it to false after a delay.
    $effect(() => {
        if ($keyboardEditIdle !== IdleKind.Idle) {
            untrack(() => {
                if (keyboardIdleTimeout) clearTimeout(keyboardIdleTimeout);
                keyboardIdleTimeout = setTimeout(
                    () => keyboardEditIdle.set(IdleKind.Idle),
                    KeyboardIdleWaitTime,
                );
            });
        }
        return () => {
            if (keyboardIdleTimeout) clearTimeout(keyboardIdleTimeout);
        };
    });

    /** Make the project global selected output and set it in a context. */
    let selectedOutput = new SelectedOutput();
    setSelectedOutput(selectedOutput);

    /**
     * Invalidates these inputs, indicating that it shouldn't be used.
     * This is a bit of a hack: we primarily use it as a way for the UI to communicate
     * to itself that when creating a new Evaluator, it shouldn't mirror the prior Evaluator's inputs.
     */
    let replayInputs = $state(true);
    function resetInputs() {
        replayInputs = false;
        updateEvaluator(project);
    }

    /**
     * Create a state to store the current evaluator.
     */
    const evaluator: Writable<Evaluator> = writable();

    let latestValue = $state<Value | undefined>();

    // When the project changes, create a new evaluator, observe it.
    let staleEvaluator = $state(false);
    projectStore.subscribe((newProject) => {
        // If the project change, but the creator is typing, debounce update after the keyboard idle wait time.
        if ($keyboardEditIdle === IdleKind.Typing) staleEvaluator = true;
        // Otherwise, update immediately.
        else updateEvaluator(newProject);
    });

    // When the keyboard becomes idle, and the evaluator is stale, update it.
    $effect(() => {
        if ($keyboardEditIdle === IdleKind.Idle && staleEvaluator) {
            updateEvaluator($projectStore);
        }
    });

    // When the locales change or the checkpoint changes, reset the evaluator to use the new locales.
    $effect(() => {
        checkpoint;
        $locales;
        untrack(() => resetInputs());
    });

    function getCheckpointProject(proj: Project) {
        return proj.withSources(
            proj.getSources().map((s, index) => [s, sources[index]]),
        );
    }

    function updateEvaluator(newProject: Project) {
        // Stop the old evaluator.
        $evaluator?.stop();

        // Make the new evaluator, replaying the previous evaluator's inputs, unless we marked the last evaluator is out of date.
        const newEvaluator = new Evaluator(
            // Is the checkpoint not now? Use the old sources instead of the current ones.
            checkpoint >= 0 ? getCheckpointProject(newProject) : newProject,
            DB,
            // Choose the selected evaluation locale or if not selected, currently selected IDE locale
            evaluationLocale ? [evaluationLocale] : localesUsed,
            true,
            replayInputs ? $evaluator : undefined,
        );

        // Switch back to replay after the next input.
        replayInputs = true;

        // Listen to the evaluator changes to update evaluator-related stores.
        newEvaluator.observe(updateEvaluatorStores);

        // Set the evaluator store
        evaluator.set(newEvaluator);

        // Mark the evaluator not stale.
        staleEvaluator = false;
    }

    /** Create a store for all of the evaluation state, so that the editor nodes can update when it changes. */
    const evaluation = writable(getEvaluationContext());
    setEvaluation(evaluation);

    function updateEvaluatorStores() {
        evaluation.set(getEvaluationContext());
    }

    function getEvaluationContext() {
        return {
            evaluator: $evaluator,
            step: $evaluator.getCurrentStep(),
            stepIndex: $evaluator.getStepIndex(),
            playing: $evaluator.isPlaying(),
            streams: $evaluator.reactions,
        };
    }

    /** Clean up the evaluator when unmounting. */
    onDestroy(() => {
        $evaluator.stop();
    });

    /** Several store contexts for tracking evaluator state. */
    const animatingNodes = writable<Set<Node>>(new Set());
    setAnimatingNodes(animatingNodes);

    /** A store for tracking editor state for all Sources */
    const editors = writable(new Map<string, EditorState>());
    setEditors(editors);

    /** A map of tile IDs to editor components, so we can pass around references for programmatic use of editors. */
    const editorViews = $state<Record<string, Editor>>({});

    function syncTiles(project: Project, tiles: Tile[]): Tile[] {
        const newTiles: Tile[] = [];

        // Go through each tile and map it to a source file.
        // If we don't find it, remove the tile.
        for (const tile of tiles) {
            if (tile.kind !== TileKind.Source) {
                newTiles.push(
                    // Playing? Expand output, collapse everything else
                    requestedPlay
                        ? tile.withMode(
                              tile.kind === TileKind.Output
                                  ? TileMode.Expanded
                                  : TileMode.Collapsed,
                          )
                        : // Not playing? Whatever it's current mode is.
                          tile,
                );
            } else {
                const source = tile.getSource(project);
                if (source)
                    newTiles.push(
                        tile
                            // If playing, keep the source files collapsed
                            .withMode(
                                requestedPlay
                                    ? TileMode.Collapsed
                                    : requestedEdit &&
                                        source === project.getMain()
                                      ? TileMode.Expanded
                                      : tile.mode,
                            ),
                    );
            }
        }

        // Go through each source file and find the tile. If we don't find one, create one.
        let index = 0;
        for (const source of project.getSources()) {
            const tile = tiles.find(
                (tile) => tile.id === Layout.getSourceID(index),
            );
            // No tile for this source yet? Create one.
            if (tile === undefined)
                newTiles.push(createSourceTile(source, index));
            index++;
        }

        return newTiles;
    }

    function createSourceTile(source: Source, index: number) {
        const expandNewTile = newSource === source;
        newSource = undefined;

        return new Tile(
            Layout.getSourceID(index),
            TileKind.Source,
            index === 0 || expandNewTile
                ? TileMode.Expanded
                : TileMode.Collapsed,
            undefined,
            Tile.randomPosition(1024, 768),
        );
    }

    function getPersistedLayout() {
        const persistedLayout = Settings.getProjectLayout(project.getID());
        return persistedLayout === null
            ? null
            : persistedLayout
                  .withTiles(syncTiles(project, persistedLayout.tiles))
                  .withFullscreen(
                      requestedEdit ? undefined : persistedLayout.fullscreenID,
                  );
    }

    function getInitialLayout() {
        const defaultTiles =
            // Create a layout in reading order.
            [
                new Tile(
                    TileKind.Palette,
                    TileKind.Palette,
                    TileMode.Collapsed,
                    undefined,
                    Tile.randomPosition(1024, 768),
                ),
                new Tile(
                    TileKind.Documentation,
                    TileKind.Documentation,
                    // If we're not supposed to show the guide, or there's code, don't show the guide by default.
                    !guide ||
                        project.getMain().expression.expression.statements
                            .length > 0
                        ? TileMode.Collapsed
                        : TileMode.Expanded,
                    undefined,
                    Tile.randomPosition(1024, 768),
                ),
                new Tile(
                    TileKind.Collaborate,
                    TileKind.Collaborate,
                    TileMode.Collapsed,
                    undefined,
                    Tile.randomPosition(1024, 768),
                ),
                // Put output just before source so it appears in split view with editor on smaller screens.
                new Tile(
                    TileKind.Output,
                    TileKind.Output,
                    TileMode.Expanded,
                    undefined,
                    Tile.randomPosition(1024, 768),
                ),
                ...sources.map((source, index) =>
                    // If starting with output only, collapse the source initially too.
                    createSourceTile(source, index).withMode(
                        showOutput
                            ? TileMode.Collapsed
                            : index === 0 || source === newSource
                              ? TileMode.Expanded
                              : TileMode.Collapsed,
                    ),
                ),
            ];

        return (
            (persistLayout
                ? getPersistedLayout()?.withMissingTiles(defaultTiles)
                : null) ??
            new Layout(
                project.getID(),
                defaultTiles,
                // If showing output or requested play was requested, we fullscreen on output
                showOutput || requestedPlay ? TileKind.Output : undefined,
                null,
            )
        );
    }

    /** The current layout of the tile windows, starting with a serialized layout or a default. */
    let layout = $state.raw<Layout>(getInitialLayout());

    /** If project changes, create a new layout based on the new project */
    $effect(() => {
        if (untrack(() => layout.projectID) !== project.getID()) {
            layout = getInitialLayout();
        }
    });

    // If the URL requested play, set to full screen and focus on the stage.
    onMount(() => {
        if (requestedPlay) {
            const output = layout.getOutput();
            if (output) {
                setFullscreen(output);
                tick().then(() => focusTile(output.id));
            }
        }

        // After mounted, disable the requested edit.
        if (requestedEdit) requestedEdit = false;
    });

    /** When the layout or path changes, add or remove query params based on state */
    $effect(() => {
        const searchParams = new URLSearchParams(page.url.searchParams);

        if (!requestedPlay) searchParams.delete(PROJECT_PARAM_PLAY);
        if (!requestedEdit) searchParams.delete(PROJECT_PARAM_EDIT);

        // Set the URL to reflect the latest concept selected.
        if (index) {
            setConceptInURL(
                $locales,
                $path && $path.length > 0 ? $path[$path.length - 1] : undefined,
                index,
                searchParams,
            );
        }

        // Update the URL, removing = for keys with no values
        const search = `${searchParams.toString().replace(/=(?=&|$)/gm, '')}`;
        const currentSearch =
            page.url.search.charAt(0) === '?'
                ? page.url.search.substring(1)
                : page.url.search;
        // If the search params haven't changed, don't navigate.
        if (search !== currentSearch)
            goto(`?${search}`, { replaceState: true });
    });

    /** Persist the layout when it changes */
    $effect(() => {
        if (persistLayout) {
            Settings.setProjectLayout(project.getID(), layout);
        }
    });

    /** The tile being dragged */
    let draggedTile = $state<
        | {
              id: string;
              left: number;
              top: number;
              direction: ResizeDirection | null;
          }
        | undefined
    >(undefined);

    /* A global context for a node being dragged */
    let draggedStore = writable<Node | undefined>(dragged);
    $effect(() => {
        dragged = $draggedStore;
    });
    setDragged(draggedStore);

    /** True if the output should show a grid */
    let grid = $state(false);

    /** Undefined or an object defining painting configuration */
    let painting = $state(false);
    let paintingConfig = $state<PaintingConfiguration>({
        characters: 'a',
        size: 1,
        font: $locales.get((l) => l.ui.font.app),
    });

    /** Get the store of how tos stored in the locales database. */
    let howToStore = Locales.howTos;
    let howTos = $derived($howToStore[$locales.getLocaleString()]);

    /* Keep the index context up to date when it changes.*/
    $effect(() => {
        indexContext.index = index;
    });

    // Create a reactive index state for the context.
    let indexContext = $state({ index });
    setConceptIndex(indexContext);

    // After mounting, see if there's a concept in the URL, and set the path to it if so.
    let path = getConceptPath();

    // Restore the concept in the URL after mounting.
    onMount(() => {
        if (index) {
            const concept = getConceptFromURL(index, page.url.searchParams);
            if (concept && path) path.set([concept]);
        }
    });

    let latestProject: Project | undefined;

    // get the user generated how-tos that are in a gallery, if the gallery exists
    let galleryHowTos = $state<GalleryHowTo[]>([]);
    let gallery: Gallery | undefined = $state(undefined);
    $effect(() => {
        const galleryID: string | null = project.getGallery();

        if (galleryID) {
            Galleries.get(galleryID).then((gal) => {
                // Found a store? Subscribe to it, updating the gallery when it changes.
                if (gal) gallery = gal;
                // Not found? No gallery.
                else gallery = undefined;
            });
        }
    });

    $effect(() => {
        if (gallery) {
            HowTos.getHowTos(gallery.getHowTos()).then(
                (hts: GalleryHowTo[] | undefined | false) => {
                    if (hts) galleryHowTos = hts;
                },
            );
        }
    });

    // When dependencies change, create a new concept index.
    $effect(() => {
        if (
            index === undefined ||
            ($keyboardEditIdle === IdleKind.Idle && latestProject !== project)
        ) {
            latestProject = project;

            // Make a new concept index with the new project and translations, but the old examples.
            const newIndex = project
                ? ConceptIndex.make(
                      project,
                      $locales,
                      howTos instanceof Promise ? [] : howTos,
                      galleryHowTos,
                  ).withExamples(
                      index === undefined ? new Map() : index.examples,
                  )
                : undefined;

            // Set the index
            index = newIndex;

            // Map the old path to the new one using concept equality.
            if (path)
                path.set(
                    index && $path
                        ? $path
                              .map((concept) => index?.getEquivalent(concept))
                              .filter((c): c is Concept => c !== undefined)
                        : [],
                );

            // Ensure the selected source index is in bounds.
            selectedSourceIndex = Math.min(
                selectedSourceIndex,
                project.getSupplements().length,
            );
        }
    });

    // When the path changes, show the docs and mirror the concept in the URL.
    let latestPath = $state<ConceptPath>($path ?? []);

    // When the path changes, show the docs, and leave fullscreen.
    $effect(() => {
        const docs = untrack(() => layout.getDocs());
        if (
            $path &&
            $path.length > 0 &&
            ($path.length !== latestPath.length ||
                !$path.every((concept, index) =>
                    concept.isEqualTo(latestPath[index]),
                ) ||
                untrack(() => layout.isFullscreen()) ||
                (docs !== undefined && !docs.isExpanded()))
        ) {
            if (docs) {
                setFullscreen(undefined);
                setMode(docs, TileMode.Expanded);
            }
        }
    });

    // When the layout changes to hide the docs, reset the path.
    $effect(() => {
        const docs = layout.getDocs();
        if (docs?.isCollapsed()) path.set([]);
    });

    // When the path changes, set the latest path
    $effect(() => {
        latestPath = $path ?? [];
    });

    /** Build a list of visible conflicts of interest based on what tiles are expanded. */
    let visibleConflicts = $derived(
        Array.from(conflictsOfInterest.keys())
            // Get the list of sources that are expanded
            .filter(
                (source) =>
                    layout &&
                    layout.getSource(project.getIndexOfSource(source))?.mode ===
                        TileMode.Expanded,
            )
            // Convert them into lists of conflicts
            .map((source) => conflictsOfInterest.get(source) ?? [])
            // Flatten the list
            .flat(),
    );

    /**
     * Any time the evaluator of the project changes, start it.
     * */
    let updateTimer = $state<NodeJS.Timeout | undefined>(undefined);
    $effect(() => {
        // Re-evaluate immediately if not started.
        if (!$evaluator.isStarted()) $evaluator.start();
    });

    function updateConflicts() {
        // Analyzed? Update the conflicts immediately.
        if (project.analyzed === 'analyzed') {
            conflicts.set(project.getConflicts());
        }
        // Not yet analyzed? Analyze in a bit.
        else if (project.analyzed === 'unanalyzed') {
            project.analyze();
            updateTimer = setTimeout(() => {
                project.analyze();
                updateConflicts();
            }, KeyboardIdleWaitTime);
        }
        // Still analyzing? Try again later.
        else {
            if (updateTimer) clearTimeout(updateTimer);
            updateTimer = setTimeout(updateConflicts, KeyboardIdleWaitTime);
        }
    }

    /** Any time the project changes, update the conflicts soon */
    $effect(() => {
        if (project) updateConflicts();
        return () => {
            if (updateTimer) clearTimeout(updateTimer);
        };
    });

    /** When stepping and the current step changes, change the active source. */
    $effect(() => {
        if ($evaluation.playing === false && $evaluation.step) {
            const source = project.getSourceOf($evaluation.step.node);
            const tile = source
                ? untrack(() => layout).getSource(
                      project.getIndexOfSource(source),
                  )
                : undefined;
            if (tile && tile.mode === TileMode.Collapsed) {
                untrack(() => setMode(tile, TileMode.Expanded));
            }
        }
    });

    /** When output selection changes, make the palette visible. */
    $effect(() => {
        const palette = untrack(() => layout).getPalette();
        if (palette) {
            if (!selectedOutput.isEmpty()) {
                if (palette.mode === TileMode.Collapsed)
                    untrack(() => setMode(palette, TileMode.Expanded));
            }
        }
    });

    /** When the canvas size changes, resize the layout */
    $effect(() => {
        refreshLayout();
    });

    function refreshLayout() {
        layout = untrack(() => layout).resized(
            $arrangement,
            canvasWidth,
            canvasHeight,
        );
    }

    let adjusting = $state(false);

    /** Take the given axis, group, and split, and adjust it. */
    function adjustSplit(axis: number, index: number, split: number) {
        layout = layout.withSplit(
            $arrangement,
            axis,
            index,
            split,
            canvasWidth,
            canvasHeight,
        );
        refreshLayout();
    }

    /** The furthest boundary of a dragged tile, defining the dimensions of the canvas while in freeform layout mode. */
    let maxRight = $state(0);
    let maxBottom = $state(0);

    /** Recompute the bounds based every time the layout changes. */
    $effect(() => {
        maxRight = Math.max.apply(undefined, [
            maxRight,
            ...(layout
                ? layout.tiles.map(
                      (tile) => tile.position.left + tile.position.width,
                  )
                : []),
        ]);
        maxBottom = Math.max.apply(undefined, [
            maxBottom,
            ...(layout
                ? layout.tiles.map(
                      (tile) => tile.position.top + tile.position.height,
                  )
                : []),
        ]);
    });

    /** When the program steps or locales change, get the latest value of the program's evaluation. */
    $effect(() => {
        $evaluation;
        $locales;

        // We don't use the source we compute in the reaction above because we want this to be based only
        // on the current evaluator. This is because we sometimes evaluate some time after updating the project
        // for typing responsiveness.
        const source = $evaluator.project.getSources()[selectedSourceIndex];
        if (source) latestValue = $evaluator.getLatestSourceValue(source);
    });

    /**
     * When the layout changes, create an ID to key off of when generating tile views.
     * This is necessary because of a defect in Svelte's keyed each behavior, which
     * doesn't appear to be able to handle swaps in a list.
     */
    const tileIDSequence = $derived(
        layout ? layout.tiles.map((tile) => tile.id).join(',') : '',
    );

    /** If the source file corresponding to the menu closes, hide the menu. */
    $effect(() => {
        if (menu) {
            // Find the tile corresponding to the menu's source file.
            const index = sources.indexOf(menu.getSource());
            const tile = layout?.tiles.find(
                (tile) => tile.id === Layout.getSourceID(index),
            );
            if (tile && tile.isCollapsed()) hideMenu();
        }
    });

    /** If the camera or mic changes, restart the evaluator to reflect to the new stream. */
    const cameraUnsubscribe = camera.subscribe(() => resetInputs());
    const micUnsubscribe = mic.subscribe(() => resetInputs());

    onDestroy(() => {
        cameraUnsubscribe();
        micUnsubscribe();
    });

    function hideMenu() {
        // Hide the menu
        menu = undefined;
    }

    let menuPosition = $state<ReturnType<typeof getMenuPosition> | undefined>(
        undefined,
    );

    /** When the menu changes, compute a menu position. */
    $effect(() => {
        menuPosition = menu ? getMenuPosition(menu) : undefined;
    });

    // When the locale direction changes, update the output.
    $effect(() => {
        const direction = $locales.getDirection();
        /** After each update, measure an outline of the node view in the drag container. */
        const nodeView = dragContainer?.querySelector('.node-view');
        if (nodeView instanceof HTMLElement)
            outline = {
                types: ['dragging'],
                outline: getOutlineOf(
                    nodeView,
                    true,
                    direction === 'rtl',
                    $blocks,
                ),
                underline: getUnderlineOf(
                    nodeView,
                    true,
                    direction === 'rtl',
                    $blocks,
                ),
            };
    });

    /**
     * This reactive block creates a ProjectView wide context for commands to do their work,
     * particularly CommandButtons.
     */
    let commandContext: CommandContext = $derived({
        // Send the active caret, unless a non-source tile is fullscreen
        caret:
            layout === undefined || layout.isFullscreenNonSource()
                ? undefined
                : (Array.from($editors.values()).find(
                      (editor) => editor.focused,
                  )?.caret ?? Array.from($editors.values())[0]?.caret),
        project,
        editor: false,
        /** We intentionally depend on the evaluation store because it updates when the evaluator's state changes */
        evaluator: $evaluation.evaluator,
        locales: $locales,
        dragging: dragged !== undefined,
        database: DB,
        setFullscreen: (on: boolean) => setBrowserFullscreen(on),
        focusOrCycleTile,
        resetInputs,
        toggleBlocks,
        blocks: $blocks,
        view: undefined,
        help: () => (showHelpDialog = !showHelpDialog),
    });

    // Create reactive context to share the above.
    let commandContextState = $state({ context: commandContext });
    $effect(() => {
        commandContextState.context = commandContext;
    });
    setProjectCommandContext(commandContextState);

    // Get the chat for the project, if there is one.
    // undefined: there isn't one
    // null: we're still loading
    // false: couldn't load it.
    let chat = $state<Chat | undefined | null | false>(null);
    $effect(() => {
        // When the project or chat change, get the chat.
        Chats.getChat(project).then((retrievedChat) => {
            chat = retrievedChat;
        });
    });

    // When ovewritten, announce it
    $effect(() => {
        if (overwritten)
            untrack(() => {
                if ($announce) {
                    $announce(
                        project.getID(),
                        $locales.getLanguages()[0],
                        $locales.get((l) => l.ui.source.overwritten),
                    );
                }
            });
    });

    let currentArrangement = $state<Arrangement>($arrangement);

    /** When dragged is set, update the layout if necessary to support dragging to the last editor. */
    $effect(() => {
        // Get the current layout (without making a dependnecy, since we assign below).
        const currentLayout = untrack(() => layout);

        // Figure out what arrangement we're in.
        currentArrangement = Layout.getComputedLayout(
            $arrangement,
            canvasWidth,
            canvasHeight,
        );
        // Not in single? Don't do anything.
        if (currentArrangement !== Arrangement.Single) return;
        // Find the latest source being viewed.
        const latestSource = currentLayout.getSources().at(-1);
        if (latestSource === undefined) return;
        // If dragging something
        if (dragged) {
            // And the latest source does not contain what's being dragged
            if (!latestSource.getSource(project)?.contains(dragged)) {
                // Move the source to the end and make it visible.
                layout = currentLayout
                    .withTileLast(latestSource)
                    .resized($arrangement, canvasWidth, canvasHeight);
            }
        }
    });

    function toggleBlocks(on: boolean) {
        Settings.setBlocks(on);
    }

    function getTileView(tileID: string) {
        return view?.querySelector(`.tile[data-id="${tileID}"]`) ?? null;
    }

    function focusTile(focusedTileID: string | undefined) {
        if (view === undefined || view === null || layout === undefined) return;

        const firstTileID = layout.tiles.find(
            (tile) => !tile.isCollapsed(),
        )?.id;
        const focusedTileView = focusedTileID
            ? getTileView(focusedTileID)
            : null;
        const firstTileView = firstTileID
            ? getTileView(firstTileID)
            : undefined;
        const tileView = focusedTileView ?? firstTileView;

        let viewToFocus: HTMLElement | undefined = undefined;
        if (tileView) {
            // If the tile already has a child with focus, don't change it.
            if (tileView.contains(document.activeElement)) return;

            const defaultFocus = tileView.querySelectorAll(
                '[data-defaultfocus]',
            )[0];
            if (defaultFocus instanceof HTMLElement) viewToFocus = defaultFocus;
            else {
                const focusable = tileView.querySelectorAll(
                    'input, button, [tabindex="0"]',
                )[0];
                if (focusable instanceof HTMLElement) viewToFocus = focusable;
            }
        }

        // No tiles visible? Just focus on the project view.
        const newFocus = viewToFocus ?? view;
        if (newFocus)
            setKeyboardFocus(
                newFocus,
                'Focusing on project as no tiles are visible',
            );
    }

    async function focusOrCycleTile(content?: TileKind) {
        const visible = layout.tiles.filter((tile) => !tile.isCollapsed());
        const currentTileIndex = visible.findIndex((tile) => {
            const view = getTileView(tile.id);
            return (
                view &&
                (view === document.activeElement ||
                    view.contains(document.activeElement))
            );
        });
        const currentTile = visible[currentTileIndex];

        // No kind specified? Cycle through visible tiles.
        if (content === undefined) {
            const next =
                visible[
                    currentTileIndex < 0 ||
                    currentTileIndex + 1 >= visible.length
                        ? 0
                        : currentTileIndex + 1
                ];
            if (next) focusTile(next.id);
        }
        // Not source? Toggle the kind.
        else if (content !== TileKind.Source) {
            const tile = layout.tiles.find((tile) => tile.kind === content);
            if (tile) {
                toggleTile(tile);
                await tick();
                focusTile(tile.id);
            }
        }
        // Source? Cycle through source, expanding as necessary.
        else if (currentTileIndex) {
            const sources = layout.getSources();
            const index = sources.findIndex(
                (source) => source.id === currentTile.id,
            );
            const next =
                sources[
                    index < 0 ? 0 : index + 1 >= sources.length ? 0 : index + 1
                ];
            if (next) {
                if (next.isCollapsed()) {
                    toggleTile(next);
                    await tick();
                    focusTile(next.id);
                } else focusTile(next.id);
            }
        }
    }

    /** Update the mode and move the tile last to bring it to the front. */
    function setMode(tile: Tile, mode: TileMode) {
        // Special case selected output and the palette, removing the selection of collapsing.
        if (tile === layout.getPalette()) {
            if (tile.mode === TileMode.Expanded)
                selectedOutput.setPaths(project, [], 'editor');
        }

        layout = layout
            .withTileLast(tile.withMode(mode))
            .resized($arrangement, canvasWidth, canvasHeight);
    }

    function setFullscreen(tile: Tile | undefined) {
        if (tile === undefined && requestedPlay) stopPlaying();

        if (tile) {
            layout = layout.withFullscreen(tile.id);
        } else {
            layout = layout.withoutFullscreen();
        }
    }

    function setBrowserFullscreen(on: boolean) {
        browserFullscreen = on;
        if (browserFullscreen) document.documentElement.requestFullscreen();
        else if (document.fullscreenElement) document.exitFullscreen();
        else setFullscreen(undefined);
    }

    async function positionTile(tile: Tile, position: Bounds) {
        layout = layout.withTilePosition(tile, position);

        // Scroll tile into view if out
        await tick();
        if (draggedTile) scrollToTileView(tile.id);
    }

    function handlePointerDown(event: PointerEvent) {
        if (event.buttons !== 1) return;

        event.stopPropagation();
        event.stopImmediatePropagation();

        // Is the arrangement free? Start dragging the tile if so.
        if ($arrangement === Arrangement.Free) {
            const tileView = document
                .elementFromPoint(event.clientX, event.clientY)
                ?.closest('.tile');

            if (tileView instanceof HTMLElement && tileView.dataset.id) {
                const rect = tileView.getBoundingClientRect();
                const id = tileView.dataset.id;

                draggedTile = {
                    id: id,
                    left: event.clientX - rect.left,
                    top: event.clientY - rect.top,
                    direction: null,
                };

                const tile = layout.getTileWithID(id);
                if (tile) layout = layout.withTileLast(tile);
            }
        }

        // Find the tile clicked and focus it.
        const el = document.elementFromPoint(event.clientX, event.clientY);
        if (el) {
            const tile = el.closest('.tile');
            if (tile instanceof HTMLElement) {
                focusTile(tile.dataset.id);
                // Don't let body get focus.
                event.stopPropagation();
            }
        }
    }

    async function handlePointerMove(event: PointerEvent) {
        if (!canvas) return;
        if (!view) return;

        const rect = view.getBoundingClientRect();

        pointerX = event.clientX - rect.left + canvas.scrollLeft;
        pointerY = event.clientY - rect.top + canvas.scrollTop;

        if (!draggedTile) return;

        const tile = layout.getTileWithID(draggedTile.id);
        if (tile) {
            let newBounds;
            if (draggedTile.direction === null) {
                newBounds = {
                    left: Math.max(pointerX - draggedTile.left, 0),
                    top: Math.max(pointerY - draggedTile.top, 0),
                    width: tile.position.width,
                    height: tile.position.height,
                };
            } else {
                const left = draggedTile.direction.includes('left');
                const top = draggedTile.direction.includes('top');
                const right = draggedTile.direction.includes('right');
                const bottom = draggedTile.direction.includes('bottom');
                newBounds = {
                    left: left ? pointerX : tile.position.left,
                    top: top ? pointerY : tile.position.top,
                    width: left
                        ? tile.position.width + (tile.position.left - pointerX)
                        : right
                          ? pointerX - tile.position.left
                          : tile.position.width,
                    height: top
                        ? tile.position.height + (tile.position.top - pointerY)
                        : bottom
                          ? pointerY - tile.position.top
                          : tile.position.height,
                };
            }
            if (newBounds) {
                layout = layout.withTilePosition(tile, newBounds);

                // Scroll tile into view if out
                await tick();
                if (draggedTile) scrollToTileView(draggedTile.id);
            }
        }
    }

    function scrollToTileView(id: string) {
        if (canvas === undefined) return;

        const view = document.querySelector(`.tile[data-id=${id}]`);
        if (view) {
            const canvasRect = canvas.getBoundingClientRect();
            const tileRect = view.getBoundingClientRect();
            const threshold = 50;
            if (tileRect.right > canvasRect.right + threshold)
                canvas.scrollLeft = canvas.scrollLeft + threshold / 2;
            if (tileRect.bottom > canvasRect.bottom + threshold)
                canvas.scrollTop = canvas.scrollTop + threshold / 2;
            if (tileRect.left < canvasRect.left - threshold)
                canvas.scrollLeft = canvas.scrollLeft - threshold / 2;
            if (tileRect.top < canvasRect.top - threshold)
                canvas.scrollTop = canvas.scrollTop - threshold / 2;
        }
    }

    function handlePointerUp() {
        dragged = undefined;
        draggedTile = undefined;
    }

    function resizeTile(
        id: string,
        direction: ResizeDirection,
        left: number,
        top: number,
    ) {
        draggedTile = {
            id,
            left,
            top,
            direction,
        };
    }

    function repositionFloaters() {
        menuPosition = menu ? getMenuPosition(menu) : undefined;
    }

    function getSourceIndexByID(id: string) {
        return parseInt(id.replace('source', ''));
    }

    function getSourceByTileID(id: string): Source | undefined {
        return sources[getSourceIndexByID(id)];
    }

    function handleKey(event: KeyboardEvent) {
        syncKeyModifiers(event);

        if (dragged !== undefined && event.key === 'Escape')
            dragged = undefined;

        // See if there's a command that matches...
        const [, result] = handleKeyCommand(event, commandContext);

        // If something handled it, consume the event, and reset the modifier state.
        if (typeof result !== 'function' && result !== false) {
            event.stopPropagation();
            event.preventDefault();

            // Reset the key modifiers since a command was consumed.
            resetKeyModifiers();
        }
    }

    function resetKeyModifiers() {
        keyModifiers.set({ control: false, alt: false, shift: false });
    }

    function handleKeyUp(event: KeyboardEvent) {
        syncKeyModifiers(event);
    }

    function syncKeyModifiers(event: KeyboardEvent) {
        keyModifiers.set({
            control: event.metaKey || event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
        });
    }

    function getMenuPosition(menu: MenuInfo) {
        const source = menu.getSource();
        const anchor = menu.getAnchor();

        // Find the editor
        const editor = document.querySelector(
            `.editor[data-id="${source.id}"]`,
        );
        if (editor === null) return undefined;

        const project = document.querySelector('.project');
        if (project === null) return undefined;

        const projectBounds = project.getBoundingClientRect();

        if (isFieldPosition(anchor)) {
            // Is it a field position? Position near the field.
            const trigger = editor.querySelector(
                `.node-view[data-id="${anchor.parent.id}"] .trigger[data-field="${anchor.field}"]`,
            );
            if (trigger == null) return undefined;
            const triggerBounds = trigger.getBoundingClientRect();
            return {
                left: triggerBounds.left - projectBounds.left,
                top:
                    triggerBounds.bottom -
                    triggerBounds.height / 4 -
                    projectBounds.top,
            };
        } else {
            // Is it a node? Position near it's top left.
            if (anchor instanceof Node) {
                const view = editor.querySelector(
                    `.node-view[data-id="${anchor.id}"]`,
                );
                if (view == null) return undefined;
                const nodeBounds = view.getBoundingClientRect();
                return {
                    left: nodeBounds.left - projectBounds.left,
                    top: nodeBounds.bottom - projectBounds.top,
                };
            }
            // Is it a position? Position at the bottom right of the caret.
            else if (typeof anchor === 'number') {
                // Find the position of the caret in the editor.
                const caretView = editor.querySelector('.caret');
                if (caretView === null) return undefined;
                const caretBounds = caretView.getBoundingClientRect();
                return {
                    left: caretBounds.left - projectBounds.left,
                    top: caretBounds.bottom - projectBounds.top,
                };
            }
        }
    }

    function toggleTile(tile: Tile) {
        setMode(
            tile,
            tile.mode === TileMode.Expanded && !tile.isInvisible()
                ? TileMode.Collapsed
                : TileMode.Expanded,
        );
    }

    function addSource() {
        const newProject = project.withNewSource(
            `${$locales.get((l) => l.term.source)}${
                project.getSupplements().length + 1
            }`,
        );

        // Remember this new source so when we compute the new layout, we can remember to expand it initially.
        newSource = newProject.getSupplements().at(-1);

        // This will propogate back to a new project here, updating the UI.
        Projects.reviseProject(newProject);

        // Sync the tiles.
        layout = layout.withTiles(syncTiles(newProject, layout.tiles));

        refreshLayout();
    }

    function removeSource(source: Source) {
        const newProject = project.withoutSource(source);
        Projects.reviseProject(newProject);
        layout = layout.withTiles(syncTiles(newProject, layout.tiles));
        refreshLayout();
    }

    function renameSource(id: string, name: string) {
        if (!isName(name)) return;
        const source = getSourceByTileID(id);
        if (!source) return;
        Projects.reviseProject(
            project.withSource(
                source,
                source.withName(name, $locales.getLocales()[0]),
            ),
        );
    }

    function stopPlaying() {
        const main = layout.getTileWithID(Layout.getSourceID(0));
        if (main) {
            if (requestedPlay) {
                requestedPlay = false;
                setMode(main, TileMode.Expanded);
            }
            layout = layout.withoutFullscreen();
        }
    }

    function revert() {
        if (original) Projects.reviseProject(original);
    }
</script>

<svelte:head><title>Wordplay - {project.getName()}</title></svelte:head>

<svelte:window
    onkeydown={handleKey}
    onkeyup={handleKeyUp}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onfocus={resetKeyModifiers}
    onblur={(event) => {
        resetKeyModifiers();
        handlePointerUp();
        event.preventDefault();
    }}
/>

<svelte:document
    onfullscreenchange={() => {
        if (!document.fullscreenElement) browserFullscreen = false;
    }}
/>

{#if warn}
    <Moderation {project} />
{/if}
<!-- Render the current project. -->
<main class="project" class:dragging={dragged !== undefined} bind:this={view}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="canvas"
        class:free={$arrangement === Arrangement.Free}
        onpointerdown={handlePointerDown}
        onpointerup={handlePointerUp}
        onpointermove={handlePointerMove}
        ontransitionend={repositionFloaters}
        onscroll={repositionFloaters}
        bind:clientWidth={canvasWidth}
        bind:clientHeight={canvasHeight}
        bind:this={canvas}
    >
        <!-- This little guy enables the scroll bars to appear at the furthest extent a window has moved. -->
        {#if $arrangement === Arrangement.Free}
            <div
                class="boundary"
                style:left="{maxRight}px"
                style:top="{maxBottom}px"
                style:position="absolute">&nbsp;</div
            >
        {/if}

        {#key tileIDSequence}
            <!-- Are all the tiles collapsed? Show a bit of feedback suggesting navigating down. -->
            {#if layout.tiles.every((tile) => tile.isCollapsed())}
                <div class="empty">
                    <Speech character={Characters.FunctionDefinition}>
                        {#snippet content()}
                            <LocalizedText
                                path={(l) => l.ui.project.collapsed}
                            /> ⬇
                        {/snippet}
                    </Speech>
                </div>
            {:else}
                <!-- Lay out each of the tiles according to its specification, in order if in free layout, but in layout order if not. -->
                {#each $arrangement === Arrangement.Free ? layout.tiles : layout.getTilesInReadingOrder() as tile (tile.id)}
                    {#if tile.isExpanded() && (layout.fullscreenID === undefined || layout.fullscreenID === tile.id)}
                        <TileView
                            {project}
                            {tile}
                            {layout}
                            editable={editableAndCurrent}
                            arrangement={$arrangement}
                            background={tile.kind === TileKind.Output
                                ? outputBackground
                                : null}
                            dragging={draggedTile?.id === tile.id}
                            animated={!adjusting}
                            fullscreenID={layout.fullscreenID}
                            focuscontent={tile.kind === TileKind.Source ||
                                tile.kind === TileKind.Output}
                            setMode={(mode) => setMode(tile, mode)}
                            position={(position: Bounds) =>
                                positionTile(tile, position)}
                            resize={(id, direction, left, top) =>
                                resizeTile(id, direction, left, top)}
                            scroll={repositionFloaters}
                            rename={(id, name) => renameSource(id, name)}
                            setFullscreen={(fullscreen) => {
                                if (
                                    layout.isFullscreen() &&
                                    tile.kind === TileKind.Output
                                )
                                    stopPlaying();
                                setFullscreen(fullscreen ? tile : undefined);
                            }}
                        >
                            {#snippet title()}
                                {#if tile.kind === TileKind.Output}
                                    <span
                                        title={$locales.get(
                                            (l) =>
                                                l.ui.dialog.settings.mode
                                                    .animate,
                                        ).labels[$animationFactor]}
                                    >
                                        <!-- <Emoji>{AnimationFactorIcons[$animationFactor]}</Emoji> -->
                                    </span>
                                {/if}
                            {/snippet}

                            {#snippet extra()}
                                {#if tile.kind === TileKind.Source}
                                    {@const source = getSourceByTileID(tile.id)}
                                    <!-- Can't delete main. -->
                                    {#if source && editable && source !== project.getMain()}
                                        <ConfirmButton
                                            tip={(l) =>
                                                l.ui.source.confirm.delete
                                                    .description}
                                            action={() => removeSource(source)}
                                            prompt={(l) =>
                                                l.ui.source.confirm.delete
                                                    .prompt}
                                            >{CANCEL_SYMBOL}</ConfirmButton
                                        >
                                    {/if}
                                {/if}
                                <!-- Put some extra buttons in the output toolbar -->
                                {#if tile.kind === TileKind.Output}
                                    {#if !editable}<CopyButton {project}
                                        ></CopyButton>{/if}
                                    {#if (requestedPlay || showOutput) && layout.isFullscreen()}<Button
                                            uiid="editProject"
                                            background
                                            padding={false}
                                            tip={(l) =>
                                                l.ui.page.projects.button
                                                    .viewcode}
                                            action={() => stopPlaying()}
                                            icon="👁️"
                                        ></Button>{/if}
                                    <CommandButton
                                        background
                                        command={Restart}
                                    />
                                    {#if localesUsed.length > 0}<OutputLocaleChooser
                                            {localesUsed}
                                            locale={evaluationLocale}
                                            change={(locale) => {
                                                evaluationLocale = locale;
                                                updateEvaluator(project);
                                            }}
                                        />{/if}
                                    <!-- {#if !$evaluation.evaluator.isPlaying()}
                                    <Painting
                                            bind:painting
                                        />{/if} -->
                                    <Toggle
                                        background
                                        tips={(l) => l.ui.output.toggle.grid}
                                        on={grid}
                                        toggle={() => (grid = !grid)}
                                        ><Emoji>▦</Emoji></Toggle
                                    ><Toggle
                                        background
                                        tips={(l) => l.ui.output.toggle.fit}
                                        on={fit}
                                        toggle={() => (fit = !fit)}
                                        ><Emoji
                                            >{#if fit}🔒{:else}🔓{/if}</Emoji
                                        ></Toggle
                                    >
                                    <Mode
                                        modes={(l) =>
                                            l.ui.dialog.settings.mode.animate}
                                        choice={AnimationFactors.indexOf(
                                            $animationFactor,
                                        )}
                                        select={(choice) =>
                                            Settings.setAnimationFactor(
                                                AnimationFactors[choice],
                                            )}
                                        icons={AnimationFactorIcons}
                                        modeLabels={false}
                                        labeled={false}
                                    />
                                    {#if $animationFactor === 0}{$locales.get(
                                            (l) =>
                                                l.ui.dialog.settings.mode
                                                    .animate,
                                        ).labels[0]}{/if}
                                {:else if tile.isSource()}
                                    {#if !editable}<CopyButton {project}
                                        ></CopyButton>{/if}
                                    <Toolbar
                                        sourceID={tile.id}
                                        navigateCommands={VisibleNavigateCommands}
                                        modifyCommands={VisibleModifyCommands}
                                        {editable}
                                        {localesUsed}
                                        {editorLocales}
                                        onChangeLocale={(locale) => {
                                            editorLocales[tile.id] = locale;
                                        }}
                                    />
                                {/if}
                            {/snippet}
                            {#snippet content()}
                                {#if tile.kind === TileKind.Documentation}
                                    <Documentation
                                        {project}
                                        standalone={false}
                                    />
                                {:else if tile.kind === TileKind.Palette}
                                    <Palette
                                        {project}
                                        editable={editableAndCurrent}
                                        editors={Array.from($editors.values())}
                                    />
                                {:else if tile.kind === TileKind.Output}
                                    <OutputView
                                        {project}
                                        evaluator={$evaluator}
                                        value={latestValue}
                                        bind:fit
                                        bind:grid
                                        bind:painting
                                        {paintingConfig}
                                        bind:background={outputBackground}
                                        editable={editableAndCurrent}
                                    />
                                {:else if tile.kind === TileKind.Collaborate}
                                    <CollaborateView {project} {chat} />
                                    <!-- Show an editor, annotations, and a mini output view -->
                                {:else if tile.kind === TileKind.Source}
                                    {@const source = getSourceByTileID(tile.id)}
                                    {#if source}
                                        <div class="annotated-editor">
                                            <Editor
                                                bind:this={editorViews[tile.id]}
                                                {project}
                                                evaluator={$evaluator}
                                                {source}
                                                locale={editorLocales[
                                                    tile.id
                                                ] ?? null}
                                                editable={editableAndCurrent}
                                                {overwritten}
                                                sourceID={tile.id}
                                                selected={source ===
                                                    selectedSource}
                                                autofocus={autofocus &&
                                                    tile.isExpanded() &&
                                                    getSourceByTileID(
                                                        tile.id,
                                                    ) === project.getMain()}
                                                bind:menu
                                                updateConflicts={(
                                                    source,
                                                    conflicts,
                                                ) => {
                                                    conflictsOfInterest =
                                                        new Map(
                                                            conflictsOfInterest.set(
                                                                source,
                                                                conflicts,
                                                            ),
                                                        );
                                                }}
                                                setOutputPreview={() =>
                                                    (selectedSourceIndex =
                                                        getSourceIndexByID(
                                                            tile.id,
                                                        ))}
                                                setLargeDeletionNotification={setLargeDeletionNotification(
                                                    tile.id,
                                                )}
                                            />
                                        </div>
                                    {/if}
                                {/if}
                            {/snippet}
                            {#snippet footer()}
                                {#if tile.kind === TileKind.Source && editable}
                                    {#if editableAndCurrent}<GlyphChooser
                                            sourceID={tile.id}
                                        />{/if}
                                    {#if checkpoint > -1}
                                        <div class="editor-warning"
                                            ><LocalizedText
                                                path={(l) =>
                                                    l.ui.checkpoints.label
                                                        .restore}
                                            />
                                            <Button
                                                background
                                                tip={(l) =>
                                                    l.ui.checkpoints.button
                                                        .restore}
                                                active={checkpoint > -1}
                                                action={() => {
                                                    // Save a version of the project with the current source in the history and the new source the old source.
                                                    Projects.reviseProject(
                                                        getCheckpointProject(
                                                            project.withCheckpoint(),
                                                        ),
                                                    );
                                                    checkpoint = -1;
                                                }}
                                                label={(l) =>
                                                    l.ui.checkpoints.button
                                                        .restore}
                                            />
                                        </div>
                                    {/if}
                                    {#if largeDeletionNotifications.get(tile.id)}
                                        <div
                                            class="large-deletion-notification"
                                        >
                                            {largeDeletionNotifications.get(
                                                tile.id,
                                            )}
                                        </div>
                                    {/if}
                                {:else if tile.kind === TileKind.Output && layout.fullscreenID !== tile.id && !requestedPlay && !showOutput}
                                    <Timeline evaluator={$evaluator} />{/if}
                            {/snippet}
                            {#snippet margin()}
                                {#if tile.kind === TileKind.Source && editable}
                                    {@const source = getSourceByTileID(tile.id)}
                                    {#if source}
                                        <Annotations
                                            {project}
                                            evaluator={$evaluator}
                                            {source}
                                            sourceID={tile.id}
                                            conflicts={visibleConflicts}
                                            stepping={$evaluation.playing ===
                                                false}
                                            caret={$editors.get(tile.id)?.caret}
                                        />{/if}
                                {/if}
                            {/snippet}
                        </TileView>
                    {/if}
                {/each}
                <!-- If in a layout that supports resizing, create an adjuster for each axis split in the current layout that isn't the first in the axis -->
                {#if isResizeable(currentArrangement)}
                    {#each layout.getSplits(currentArrangement, canvasWidth, canvasHeight) ?? [] as axis, axisIndex}
                        {#each axis.positions as _, groupIndex}
                            {#if groupIndex > 0}
                                <PositionAdjuster
                                    {axis}
                                    index={groupIndex}
                                    {layout}
                                    adjuster={(split) =>
                                        adjustSplit(
                                            axisIndex,
                                            groupIndex,
                                            split,
                                        )}
                                    setAdjusting={(state) =>
                                        (adjusting = state)}
                                    {adjusting}
                                    width={canvasWidth}
                                    height={canvasHeight}
                                ></PositionAdjuster>
                            {/if}
                        {/each}
                    {/each}
                {/if}
            {/if}
        {/key}
    </div>

    {#if !layout.isFullscreen() && !requestedPlay}
        <nav class="footer">
            <div class="footer-row">
                {#if original}<Button
                        uiid="revertProject"
                        tip={(l) => l.ui.project.button.revert}
                        active={!project.equals(original)}
                        action={() => revert()}
                        icon="↺"
                    ></Button>{/if}
                {#if creator}
                    <CreatorView {creator} />
                {/if}
                <Subheader compact>
                    {#if editable}
                        <TextField
                            id="project-name"
                            text={project.getName()}
                            description={(l) =>
                                l.ui.project.field.name.description}
                            placeholder={(l) =>
                                l.ui.project.field.name.placeholder}
                            changed={(name) =>
                                Projects.reviseProject(project.withName(name))}
                            max="7em"
                        />
                    {:else}{project.getName()}{/if}
                </Subheader>
                {#if editable}
                    <Button
                        uiid="addSource"
                        tip={(l) => l.ui.project.button.addSource}
                        action={addSource}
                        icon="+{Characters.Program.symbols}"
                    ></Button>{/if}
                {#each sources as source, index (index)}
                    {@const tile = layout.getTileWithID(
                        Layout.getSourceID(index),
                    )}
                    {#if tile}
                        <!-- Source toggle is expanded if it's mode is expanded and it's not empty -->
                        <SourceTileToggle
                            {project}
                            {source}
                            expanded={tile.mode === TileMode.Expanded &&
                                !tile.isInvisible()}
                            toggle={() => toggleTile(tile)}
                        />
                    {/if}
                {/each}
                {#each layout.getNonSources() as tile (tile.id)}
                    <!-- No need to show the tile if not visible when not editable. -->
                    <!-- Show collaborate tile if the user is a commenter -->
                    {#if tile.isVisibleCollapsed(editable || (tile.kind === TileKind.Collaborate && isCommenter))}
                        <NonSourceTileToggle
                            {project}
                            {tile}
                            toggle={() => toggleTile(tile)}
                            notification={tile.kind === TileKind.Collaborate &&
                                !!chat &&
                                isAuthenticated($user) &&
                                chat.hasUnread($user.uid)}
                        />
                    {/if}
                {/each}
                <span class="right-align">
                    <Dialog
                        header={(l) => l.ui.dialog.help.header}
                        explanation={(l) => l.ui.dialog.help.explanation}
                        button={{
                            tip: ShowKeyboardHelp.description,
                            icon: ShowKeyboardHelp.symbol,
                        }}><Shortcuts /></Dialog
                    >
                    <CurrentLayout
                        arrangement={$arrangement}
                        {canvasWidth}
                        {canvasHeight}
                    />
                    <Toggle
                        tips={(l) => l.ui.tile.toggle.fullscreen}
                        on={browserFullscreen}
                        command={browserFullscreen
                            ? ExitFullscreen
                            : EnterFullscreen}
                        toggle={() => setBrowserFullscreen(!browserFullscreen)}
                    >
                        <FullscreenIcon />
                    </Toggle>
                </span>
            </div>
            {#if editable}
                <div class="footer-row">
                    {#if shareable}
                        <Dialog
                            header={(l) => l.ui.dialog.share.header}
                            explanation={(l) => l.ui.dialog.share.explanation}
                            button={{
                                tip: (l) => l.ui.project.button.share.tip,
                                icon:
                                    project.isPublic() &&
                                    isFlagged(project.getFlags())
                                        ? '‼️'
                                        : '↗',
                                label: (l) => l.ui.project.button.share.label,
                            }}
                        >
                            <Sharing {project} />
                        </Dialog>
                    {/if}
                    <Separator />
                    <Translate
                        {project}
                        showAll={() => {
                            for (const id of Object.keys(editorLocales))
                                editorLocales[id] = null;
                        }}
                    ></Translate>
                    <Separator />
                    <Checkpoints {project} bind:checkpoint></Checkpoints>
                </div>
            {/if}
        </nav>

        <!-- Render the menu on top of the annotations -->
        {#if menu && menuPosition}
            <Menu bind:menu hide={hideMenu} position={menuPosition} />
        {/if}

        <!-- Render the dragged node over the whole project -->
        {#if dragged !== undefined}
            <!-- Render the highlight underneath the code -->
            <div class="drag-outline">
                {#if outline && !$blocks}<Highlight
                        {...outline}
                        above={false}
                    />{/if}
            </div>
            <div
                class="drag-container dragging"
                style="left: {pointerX - 5}px; top:{pointerY - 5}px;"
                bind:this={dragContainer}
            >
                <RootView
                    node={dragged}
                    inline
                    spaces={project.getSourceOf(dragged)?.spaces}
                    locale={$locales.getLocale()}
                    blocks={$blocks}
                />
            </div>
        {/if}
    {/if}
</main>

<style>
    :global(body) {
        touch-action: none;
    }

    .project {
        flex-grow: 1;
        justify-self: center;
        background-color: var(--wordplay-background);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        width: 100%;
        height: 100%;

        /* So tiles absolute positions are relative to the project view. */
        position: relative;

        /* Don't let iOS grab pointer move events, so we can do drag and drop. */
        touch-action: none;
    }

    .project.dragging > * {
        cursor: grabbing !important;
    }

    .project:focus:after {
        width: 100%;
        height: 100%;
        content: '';
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
    }

    .canvas {
        flex: 1;
        position: relative;
    }

    /** If in free layout mode, allow scrolling of content */
    .canvas.free {
        overflow: auto;
        width: 100%;
        height: 100%;
    }

    nav {
        display: flex;
        flex-direction: row;
        align-items: center;
        flex-wrap: nowrap;
        padding: var(--wordplay-spacing);
        gap: var(--wordplay-spacing);
        border-top: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    .drag-outline {
        z-index: 2;
        pointer-events: none;
    }

    .drag-container {
        position: absolute;
        pointer-events: none;
        z-index: 2;
        background: var(--wordplay-background);
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        opacity: 0.9;
    }

    .empty {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--wordplay-spacing);
        background: var(--wordplay-alternating-color);
    }

    .annotated-editor {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
    }

    .right-align {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: center;
        margin-left: auto;
        gap: var(--wordplay-spacing);
    }

    .footer {
        overflow-x: auto;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: flex-start;
    }

    .footer-row {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        align-items: center;
    }

    .editor-warning {
        width: 100%;
        padding: var(--wordplay-spacing);
        background: var(--wordplay-error);
        color: var(--wordplay-background);
    }

    .large-deletion-notification {
        width: 100%;
        padding: var(--wordplay-spacing);
        background: black;
        color: white;
        border: 1px solid black;
        animation: popUp 0.6s ease-out;
    }

    @keyframes popUp {
        0% {
            transform: scale(0.8);
            opacity: 0;
        }
        50% {
            transform: scale(1.05);
            opacity: 1;
        }
        100% {
            transform: scale(1);
        }
    }
</style>
