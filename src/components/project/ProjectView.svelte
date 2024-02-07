<script context="module" lang="ts">
    export const TYPING_DELAY = 300;
</script>

<script lang="ts">
    import { getContext, onDestroy, setContext, tick } from 'svelte';
    import { derived, writable, type Writable } from 'svelte/store';
    import {
        type DraggedContext,
        DraggedSymbol,
        ConceptIndexSymbol,
        type ConceptIndexContext,
        setSelectedOutput,
        type AnimatingNodesContext,
        type ConflictsContext,
        type SelectedOutputPathsContext,
        type SelectedPhraseContext,
        type EvaluatorContext,
        EvaluatorSymbol,
        SelectedOutputSymbol,
        SelectedPhraseSymbol,
        type SelectedOutputContext,
        ConflictsSymbol,
        AnimatingNodesSymbol,
        SelectedOutputPathsSymbol,
        type EvaluationContext,
        EvaluationSymbol,
        KeyboardEditIdleSymbol,
        getConceptPath,
        IdleKind,
        type EditorsContext,
        EditorsSymbol,
        type EditorState,
        ProjectCommandContextSymbol,
        AnnouncerSymbol,
        type Announce,
        type KeyModifierState,
        KeyModfifierSymbol,
    } from './Contexts';
    import type Project from '@models/Project';
    import Documentation from '@components/concepts/Documentation.svelte';
    import Annotations from '../annotations/Annotations.svelte';
    import type Conflict from '@conflicts/Conflict';
    import RootView from './RootView.svelte';
    import Highlight from '../editor/Highlight.svelte';
    import { afterUpdate } from 'svelte';
    import getOutlineOf, { getUnderlineOf } from '../editor/util/outline';
    import type { HighlightSpec } from '../editor/util/Highlights';
    import TileView, { type ResizeDirection } from './TileView.svelte';
    import Tile, { TileKind, Mode } from './Tile';
    import OutputView from '../output/OutputView.svelte';
    import Editor from '../editor/Editor.svelte';
    import Layout from './Layout';
    import NonSourceTileToggle from './NonSourceTileToggle.svelte';
    import Button from '../widgets/Button.svelte';
    import Palette from '../palette/Palette.svelte';
    import type Bounds from './Bounds';
    import type Source from '@nodes/Source';
    import SourceTileToggle from './SourceTileToggle.svelte';
    import type MenuInfo from '../editor/util/Menu';
    import Menu from '../editor/Menu.svelte';
    import Node from '@nodes/Node';
    import ConceptIndex from '../../concepts/ConceptIndex';
    import type Concept from '../../concepts/Concept';
    import ConfirmButton from '../widgets/ConfirmButton.svelte';
    import { isName } from '@parser/Tokenizer';
    import { goto } from '$app/navigation';
    import TextField from '../widgets/TextField.svelte';
    import Evaluator from '@runtime/Evaluator';
    import Evaluate from '@nodes/Evaluate';
    import { page } from '$app/stores';
    import type Caret from '../../edit/Caret';
    import GlyphChooser from '../editor/GlyphChooser.svelte';
    import Timeline from '../evaluator/Timeline.svelte';
    import type PaintingConfiguration from '../output/PaintingConfiguration';
    import {
        DB,
        locales,
        arrangement,
        camera,
        mic,
        Settings,
        Projects,
        blocks,
        localized,
        Creators,
    } from '../../db/Database';
    import Arrangement from '../../db/Arrangement';
    import type Value from '../../values/Value';
    import {
        EnterFullscreen,
        ExitFullscreen,
        Restart,
        ShowKeyboardHelp,
        VisibleModifyCommands,
        handleKeyCommand,
    } from '../editor/util/Commands';
    import CommandButton from '../widgets/CommandButton.svelte';
    import Help from './Shortcuts.svelte';
    import type Color from '../../output/Color';
    import ProjectLanguages from './ProjectLanguages.svelte';
    import Collaborators from './Collaborators.svelte';
    import Toggle from '../widgets/Toggle.svelte';
    import Announcer from './Announcer.svelte';
    import { toClipboard } from '../editor/util/Clipboard';
    import { PersistenceType } from '../../db/ProjectHistory';
    import Spinning from '../app/Spinning.svelte';
    import CreatorView from '../app/CreatorView.svelte';
    import Moderation from './Moderation.svelte';
    import { isFlagged } from '../../models/Moderation';
    import Dialog from '../widgets/Dialog.svelte';
    import Separator from './Separator.svelte';
    import Emoji from '../app/Emoji.svelte';
    import {
        PROJECT_PARAM_CONCEPT,
        PROJECT_PARAM_EDIT,
        PROJECT_PARAM_PLAY,
    } from '../../routes/project/constants';
    import Switch from '@components/widgets/Switch.svelte';
    import { withVariationSelector } from '../../unicode/emoji';
    import FullscreenIcon from './FullscreenIcon.svelte';

    export let project: Project;
    export let original: Project | undefined = undefined;
    /** If false, then all things editable are deactivated */
    export let editable = true;
    /** If true, only the output is shown in the initial layout. */
    export let showOutput = false;
    /** True if the output should be fit to content */
    export let fit = true;
    /** True if the project should focus the main editor source on mount */
    export let autofocus = true;
    /** True if the project was overwritten by another instance of Wordplay */
    export let overwritten = false;
    /** True if the moderation warnings should show */
    export let warn = true;
    /** True if public dialog should show */
    export let shareable = true;

    // Whether the project is in 'play' mode, dictated soley by a URL query parameter.
    let requestedPlay = $page.url.searchParams.get(PROJECT_PARAM_PLAY) !== null;
    let requestedEdit = $page.url.searchParams.get(PROJECT_PARAM_EDIT) !== null;

    // The HTMLElement that represents this element
    let view: HTMLElement | undefined = undefined;

    // The conflicts of interest in each editor, used to generate annotations.
    let conflictsOfInterest: Map<Source, Conflict[]> = new Map();

    /** The latest menu generated by an editor */
    let menu: MenuInfo | undefined;

    /** The latest mouse position */
    let pointerX = 0;
    let pointerY = 0;

    /** The view that contains the dragged node */
    let dragContainer: HTMLElement | undefined;

    /** The outline to display under the dragged node */
    let outline: HighlightSpec | undefined = undefined;

    /** The current canvas */
    let canvas: HTMLElement;

    /** Whether to show the keyboard help dialog */
    let showHelpDialog = false;

    /** The current canvas dimensions */
    let canvasWidth = 1024;
    let canvasHeight = 768;

    /** The background color of the output, so we can make the tile match. */
    let outputBackground: Color | string | null;

    /** True if the layout has been initialized. Used to remember to only initalize once. */
    let layoutInitialized = false;

    /** The new source recently added. Used to remember to keep it expanded initially. */
    let newSource: Source | undefined = undefined;

    /** Keep a source select, to decide what value is shown on stage */
    let selectedSourceIndex = 0;
    $: selectedSource = project.getSources()[selectedSourceIndex];

    /** The fullscreen context of the page that this is in. */
    const pageFullscreen = getContext<
        Writable<{ on: boolean; background: Color | string | null }> | undefined
    >('fullscreen');

    $: pageFullscreen?.set({
        on: layout.isFullscreen(),
        background: outputBackground,
    });

    /** Whether the browser is in fullscreen */
    let browserFullscreen = false;

    /** The conflicts present in the current project. **/
    const conflicts: ConflictsContext = writable([]);

    /** Keep the project in a store so we can derive other stores from it. */
    let projectStore = writable<Project>(project);
    $: if ($projectStore !== project) projectStore.set(project);

    /** Keep a project view global store indicating whether the creator is idle. */
    const keyboardEditIdle = writable<IdleKind>(IdleKind.Idle);
    setContext(KeyboardEditIdleSymbol, keyboardEditIdle);
    let keyboardIdleTimeout: NodeJS.Timeout | undefined = undefined;

    /** Keep a project global store indicating modifier key state, so that controls can highlight themselves */
    const keyModifiers = writable<KeyModifierState>({
        control: false,
        alt: false,
        shift: false,
    });
    setContext(KeyModfifierSymbol, keyModifiers);

    // When keyboard edit idle changes to true, set a timeout
    // to reset it to false after a delay.
    $: {
        if ($keyboardEditIdle !== IdleKind.Idle) {
            if (keyboardIdleTimeout) clearTimeout(keyboardIdleTimeout);
            keyboardIdleTimeout = setTimeout(
                () => keyboardEditIdle.set(IdleKind.Idle),
                500,
            );
        }
    }

    onDestroy(() => {
        if (keyboardIdleTimeout) clearTimeout(keyboardIdleTimeout);
    });

    /**
     * Create a project global context that stores the current selected value (and if not in an editing mode, nothing).
     * This enables output views like phrases and groups know what mode the output view is in and whether they are selected.
     * so they can render selected feedback.
     */
    const selectedOutputPaths: SelectedOutputPathsContext = writable([]);
    const selectedOutput: SelectedOutputContext = derived(
        [projectStore, selectedOutputPaths],
        ([proj, paths]) => {
            return paths
                .map(({ source, path }) => {
                    if (
                        source === undefined ||
                        path === undefined ||
                        proj === undefined
                    )
                        return undefined;
                    const name = source.getNames()[0];
                    if (name === undefined) return undefined;
                    const newSource = proj.getSourceWithName(name);
                    if (newSource === undefined) return undefined;
                    return newSource.root.resolvePath(path);
                })
                .filter(
                    (output): output is Evaluate => output instanceof Evaluate,
                );
        },
    );
    const selectedPhrase: SelectedPhraseContext = writable(null);

    setContext<SelectedOutputPathsContext>(
        SelectedOutputPathsSymbol,
        selectedOutputPaths,
    );
    setContext<SelectedOutputContext>(SelectedOutputSymbol, selectedOutput);
    setContext<SelectedPhraseContext>(SelectedPhraseSymbol, selectedPhrase);

    /**
     * Invalidates these inputs, indicating that it shouldn't be used.
     * This is a bit of a hack: we primarily use it as a way for the UI to communicate
     * to itself that when creating a new Evaluator, it shouldn't mirror the prior Evaluator's inputs.
     */
    let replayInputs = true;
    function resetInputs() {
        replayInputs = false;
        updateEvaluator(project);
    }

    /**
     * Create a store for an evaluator for the project.
     * Make it available to children.
     * When the project changes,
     */
    const evaluator: Writable<Evaluator> = writable();
    let latestValue: Value | undefined;

    setContext<EvaluatorContext>(EvaluatorSymbol, evaluator);

    // When the project changes, create a new evaluator, observe it.
    let evaluatorTimeout: NodeJS.Timeout | undefined = undefined;
    projectStore.subscribe((newProject) => {
        if ($keyboardEditIdle === IdleKind.Typing) {
            if (evaluatorTimeout) clearTimeout(evaluatorTimeout);
            evaluatorTimeout = setTimeout(
                () => updateEvaluator(newProject),
                TYPING_DELAY,
            );
        } else updateEvaluator(newProject);
    });

    function updateEvaluator(newProject: Project) {
        // Stop the old evaluator.
        $evaluator?.stop();

        // Make the new evaluator, replaying the previous evaluator's inputs, unless we marked the last evaluator is out of date.
        const newEvaluator = new Evaluator(
            newProject,
            DB,
            $locales,
            true,
            replayInputs ? $evaluator : undefined,
        );

        // Switch back to replay after the next input.
        replayInputs = true;

        // Listen to the evaluator changes to update evaluator-related stores.
        newEvaluator.observe(updateEvaluatorStores);

        // Set the evaluator store
        evaluator.set(newEvaluator);
    }

    /** Create a store for announcements for children to add to. */
    let announce: Announce;
    let announcer: Writable<Announce | undefined> = writable(undefined);
    $: announcer.set(announce);
    setContext<Writable<Announce | undefined>>(AnnouncerSymbol, announcer);

    /** Create a store for all of the evaluation state, so that the editor nodes can update when it changes. */
    const evaluation: Writable<EvaluationContext> = writable(
        getEvaluationContext(),
    );
    setContext<Writable<EvaluationContext>>(EvaluationSymbol, evaluation);

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
    const animatingNodes: AnimatingNodesContext = writable<Set<Node>>(
        new Set(),
    );

    setContext<AnimatingNodesContext>(AnimatingNodesSymbol, animatingNodes);
    setContext<ConflictsContext>(ConflictsSymbol, conflicts);

    /** A store for tracking editor state for all Sources */
    const editors = writable(new Map<string, EditorState>());
    setContext<EditorsContext>(EditorsSymbol, editors);

    // Clear the selected output upon playing.
    evaluation.subscribe((val) => {
        if (val.playing) selectedOutputPaths.set([]);
    });

    function syncTiles(tiles: Tile[]): Tile[] {
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
                                  ? Mode.Expanded
                                  : Mode.Collapsed,
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
                                    ? Mode.Collapsed
                                    : requestedEdit &&
                                        source === project.getMain()
                                      ? Mode.Expanded
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
            index === 0 || expandNewTile ? Mode.Expanded : Mode.Collapsed,
            undefined,
            Tile.randomPosition(1024, 768),
        );
    }

    function initializedLayout() {
        const persistedLayout = Settings.getProjectLayout(project.getID());
        return persistedLayout === null
            ? null
            : persistedLayout
                  .withTiles(syncTiles(persistedLayout.tiles))
                  .withFullscreen(
                      requestedEdit ? undefined : persistedLayout.fullscreenID,
                  );
    }

    /** Compute a default layout, or a new layout when the languages change. */
    let layout: Layout;
    $: {
        layout =
            (!layoutInitialized || layout.projectID !== project.getID()
                ? initializedLayout()
                : null) ??
            new Layout(
                project.getID(),
                layout
                    ? syncTiles(layout.tiles)
                    : // Create a layout in reading order.
                      [
                          new Tile(
                              TileKind.Palette,
                              TileKind.Palette,
                              Mode.Collapsed,
                              undefined,
                              Tile.randomPosition(1024, 768),
                          ),
                          new Tile(
                              TileKind.Output,
                              TileKind.Output,
                              Mode.Expanded,
                              undefined,
                              Tile.randomPosition(1024, 768),
                          ),
                          new Tile(
                              TileKind.Documentation,
                              TileKind.Documentation,
                              Mode.Collapsed,
                              undefined,
                              Tile.randomPosition(1024, 768),
                          ),
                          ...project.getSources().map((source, index) =>
                              // If starting with output only, collapse the source initially too.
                              createSourceTile(source, index).withMode(
                                  showOutput
                                      ? Mode.Collapsed
                                      : index === 0 || source === newSource
                                        ? Mode.Expanded
                                        : Mode.Collapsed,
                              ),
                          ),
                      ],
                layout ? layout.fullscreenID : undefined,
            );

        // Now that we've handled it, unset it.
        requestedEdit = false;

        if (!layoutInitialized && requestedPlay) {
            const output = layout.getOutput();
            if (output) {
                setFullscreen(output);
                tick().then(() => focusTile(layout.fullscreenID));
            }
        }

        layoutInitialized = true;
    }

    /** Persist the layout when it changes */
    $: Settings.setProjectLayout(project.getID(), layout);

    /** When the layout or path changes, add or remove query params based on state */
    $: {
        const searchParams = new URLSearchParams($page.url.searchParams);

        if (!requestedPlay) searchParams.delete(PROJECT_PARAM_PLAY);
        if (!requestedEdit) searchParams.delete(PROJECT_PARAM_EDIT);

        // Set the URL to reflect the latest concept selected.
        if ($path && $path.length > 0) {
            const concept = $path[$path.length - 1];
            const name = concept.getName($locales, false);
            const ownerName = $index
                ?.getConceptOwner(concept)
                ?.getName($locales, false);

            searchParams.set(
                PROJECT_PARAM_CONCEPT,
                `${ownerName ? `${ownerName}/` : ''}${name}`,
            );
        } else searchParams.delete(PROJECT_PARAM_CONCEPT);

        // Update the URL, removing = for keys with no values
        const search = `${searchParams.toString().replace(/=(?=&|$)/gm, '')}`;
        const currentSearch =
            $page.url.search.charAt(0) === '?'
                ? $page.url.search.substring(1)
                : $page.url.search;
        // If the search params haven't changed, don't navigate.
        if (search !== currentSearch)
            goto(`?${search}`, { replaceState: true });
    }

    /** The tile being dragged */
    let draggedTile:
        | {
              id: string;
              left: number;
              top: number;
              direction: ResizeDirection | null;
          }
        | undefined = undefined;

    /** The furthest boundary of a dragged tile, defining the dimensions of the canvas while in freeform layout mode. */
    let maxRight = 0;
    let maxBottom = 0;

    /* A global context for a node being dragged */
    let dragged = writable<Node | undefined>(undefined);
    setContext<DraggedContext>(DraggedSymbol, dragged);

    /** True if the output should show a grid */
    let grid = false;

    /** Undefined or an object defining painting configuration */
    let painting = false;
    let paintingConfig: PaintingConfiguration = {
        characters: 'a',
        size: 1,
        font: $locales.get((l) => l.ui.font.app),
    };

    /** Set up project wide concept index and path context */
    export let index: ConceptIndexContext = writable(
        ConceptIndex.make(project, $locales),
    );
    setContext(ConceptIndexSymbol, index);

    // After mounting, see if there's a concept in the URL, and set the path to it if so.
    let path = getConceptPath();

    // Restore the concept in the URL.
    restoreConcept();

    function resolveConcept(conceptPath: string): Concept | undefined {
        if (conceptPath && $index) {
            const [ownerName, name] = conceptPath.split('/');
            const concept =
                ownerName && name
                    ? $index?.getSubConcept(ownerName, name)
                    : $index?.getConceptByName(ownerName);
            return concept;
        }
        return undefined;
    }

    function restoreConcept() {
        const id = $page.url.searchParams.get(PROJECT_PARAM_CONCEPT);
        const concept = id ? resolveConcept(id) : undefined;
        if (concept && path) path.set([concept]);
    }

    let latestProject: Project | undefined;

    // When the project changes, languages change, and the keyboard is idle, recompute the concept index.
    $: if ($keyboardEditIdle && latestProject !== project) {
        latestProject = project;

        // Make a new concept index with the new project and translations, but the old examples.
        const newIndex =
            project && $index
                ? ConceptIndex.make(project, $locales).withExamples(
                      $index.examples,
                  )
                : undefined;

        // Set the index
        index.set(newIndex);

        // Map the old path to the new one using concept equality.
        if (path)
            path.set(
                $index && $path
                    ? $path
                          .map((concept) => $index?.getEquivalent(concept))
                          .filter((c): c is Concept => c !== undefined)
                    : [],
            );

        // Ensure the selected source index is in bounds.
        selectedSourceIndex = Math.min(
            selectedSourceIndex,
            project.getSupplements().length,
        );
    }

    // When the path changes, show the docs and mirror the concept in the URL.
    let latestPath: Concept[] = $path ?? [];
    $: {
        if (
            $path &&
            ($path.length !== latestPath.length ||
                !$path.every((concept, index) =>
                    concept.isEqualTo(latestPath[index]),
                ))
        ) {
            const docs = layout.getDocs();
            if (docs) setMode(docs, Mode.Expanded);
        }
        // Update the latest path.
        latestPath = $path ?? [];
    }

    /** Build a list of visible conflicts of interest based on what tiles are expanded. */
    $: visibleConflicts = Array.from(conflictsOfInterest.keys())
        // Get the list of sources that are expanded
        .filter(
            (source) =>
                layout.getSource(project.getIndexOfSource(source))?.mode ===
                Mode.Expanded,
        )
        // Convert them into lists of conflicts
        .map((source) => conflictsOfInterest.get(source) ?? [])
        // Flatten the list
        .flat();

    /**
     * Reanalyze on a delay any time the project changes.
     * */
    let updateTimer: NodeJS.Timeout | undefined = undefined;
    $: {
        // Re-evaluate immediately.
        if (!$evaluator.isStarted()) $evaluator.start();

        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = setTimeout(() => {
            project.analyze();
            conflicts?.set(project.getConflicts());
        }, TYPING_DELAY);
    }

    /** When stepping and the current step changes, change the active source. */
    $: if ($evaluation.playing === false && $evaluation.step) {
        const source = project.getSourceOf($evaluation.step.node);
        const tile = source
            ? layout.getSource(project.getIndexOfSource(source))
            : undefined;
        if (tile && tile.mode === Mode.Collapsed) {
            setMode(tile, Mode.Expanded);
        }
    }

    /** When output selection changes, make the palette visible. */
    $: {
        const palette = layout.getPalette();
        if (palette) {
            if ($selectedOutput && $selectedOutput.length > 0) {
                if (palette.mode === Mode.Collapsed)
                    setMode(palette, Mode.Expanded);
            }
        }
    }

    /** When the canvas size changes, resize the layout */
    $: if (canvasWidth && canvasHeight) {
        layout = layout.resized($arrangement, canvasWidth, canvasHeight);
    }

    /** Recompute the bounds based every time the layout changes. */
    $: maxRight = Math.max.apply(undefined, [
        maxRight,
        ...layout.tiles.map((tile) => tile.position.left + tile.position.width),
    ]);
    $: maxBottom = Math.max.apply(undefined, [
        maxBottom,
        ...layout.tiles.map((tile) => tile.position.top + tile.position.height),
    ]);

    /** When the program steps or locales change, get the latest value of the program's evaluation. */
    $: {
        $evaluation;
        $locales;
        // We don't use the source we compute in the reaction above because we want this to be based only
        // on the current evaluator. This is because we sometimes evaluate some time after updating the project
        // for typing responsiveness.
        const source = $evaluator.project.getSources()[selectedSourceIndex];
        if (source) latestValue = $evaluator.getLatestSourceValue(source);
    }

    /**
     * When the layout changes, create an ID to key off of when generating tile views.
     * This is necessary because of a defect in Svelte's keyed each behavior, which
     * doesn't appear to be able to handle swaps in a list.
     */
    $: tileIDSequence = layout.tiles.map((tile) => tile.id).join(',');

    /** If the source file corresponding to the menu closes, hide the menu. */
    $: if (menu) {
        // Find the tile corresponding to the menu's source file.
        const index = project.getSources().indexOf(menu.getCaret().source);
        const tile = layout.tiles.find(
            (tile) => tile.id === Layout.getSourceID(index),
        );
        if (tile && tile.isCollapsed()) hideMenu();
    }

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

    /** When the menu changes, compute a menu position. */
    $: menuPosition = menu ? getMenuPosition(menu.getCaret()) : undefined;

    afterUpdate(() => {
        const direction = $locales.getDirection();
        /** After each update, measure an outline of the node view in the drag container. */
        const nodeView = dragContainer?.querySelector('.node-view');
        if (nodeView instanceof HTMLElement)
            outline = {
                types: ['dragging'],
                outline: getOutlineOf(nodeView, true, direction === 'rtl'),
                underline: getUnderlineOf(nodeView, true, direction === 'rtl'),
            };
    });

    function toggleBlocks(on: boolean) {
        Settings.setBlocks(on);
    }

    function getTileView(tileID: string) {
        return view?.querySelector(`.tile[data-id="${tileID}"]`) ?? null;
    }

    function focusTile(focusedTileID: string | undefined) {
        if (view === undefined || view === null) return;

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
        (viewToFocus ?? view).focus();
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

    function setMode(tile: Tile, mode: Mode) {
        if (layout.getTileWithID(tile.id)?.mode === mode) return;

        // Special case selected output and the palette.
        if (
            tile === layout.getPalette() &&
            $selectedOutput &&
            selectedOutputPaths
        ) {
            if (tile.mode === Mode.Collapsed && $selectedOutput.length === 0) {
                const output = project.getOutput();
                if (output.length > 0) {
                    setSelectedOutput(selectedOutputPaths, project, [
                        output[0],
                    ]);
                    $evaluator.pause();
                }
            } else if (tile.mode === Mode.Expanded) {
                setSelectedOutput(selectedOutputPaths, project, []);
            }
        }

        layout = layout
            .withTileLast(tile.withMode(mode))
            .resized($arrangement, canvasWidth, canvasHeight);
    }

    async function setFullscreen(tile: Tile | undefined) {
        if (tile === undefined) stopPlaying();

        if (tile) {
            layout = layout.withFullscreen(tile.id);
        } else {
            layout = layout.withoutFullscreen();
        }
    }

    function setBrowserFullscreen(on: boolean) {
        browserFullscreen = on;
        if (browserFullscreen) view?.requestFullscreen();
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
        pointerX = event.clientX + canvas.scrollLeft;
        pointerY = event.clientY + canvas.scrollTop;

        if (draggedTile) {
            const tile = layout.getTileWithID(draggedTile.id);
            if (tile) {
                let newBounds;
                if (draggedTile.direction === null) {
                    newBounds = {
                        left: pointerX - draggedTile.left,
                        top: pointerY - draggedTile.top,
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
                            ? tile.position.width +
                              (tile.position.left - pointerX)
                            : right
                              ? pointerX - tile.position.left
                              : tile.position.width,
                        height: top
                            ? tile.position.height +
                              (tile.position.top - pointerY)
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
    }

    function scrollToTileView(id: string) {
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
        dragged.set(undefined);
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
        menu = menu;
    }

    function getSourceIndexByID(id: string) {
        return parseInt(id.replace('source', ''));
    }

    function getSourceByTileID(id: string) {
        return project.getSources()[getSourceIndexByID(id)];
    }

    /**
     * This reactive block creates a ProjectView wide context for commands to do their work,
     * particularly CommandButtons.
     */
    $: commandContext = {
        // Send the active caret, unless a non-source tile is fullscreen
        caret: layout.isFullscreenNonSource()
            ? undefined
            : Array.from($editors.values()).find((editor) => editor.focused)
                  ?.caret ?? Array.from($editors.values())[0]?.caret,
        project,
        editor: false,
        /** We intentionally depend on the evaluation store because it updates when the evaluator's state changes */
        evaluator: $evaluation.evaluator,
        dragging: $dragged !== undefined,
        database: DB,
        setFullscreen: (on: boolean) => setBrowserFullscreen(on),
        focusOrCycleTile,
        resetInputs,
        toggleBlocks,
        help: () => (showHelpDialog = !showHelpDialog),
    };

    const commandContextStore = writable(commandContext);
    $: commandContextStore.set(commandContext);
    setContext(ProjectCommandContextSymbol, commandContextStore);

    function handleKey(event: KeyboardEvent) {
        syncKeyModifiers(event);

        if ($dragged !== undefined && event.key === 'Escape')
            dragged.set(undefined);

        // See if there's a command that matches...
        const [, result] = handleKeyCommand(event, commandContext);

        // If something handled it, consume the event, and reset the modifier state.
        if (result !== false) {
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

    function getMenuPosition(caret: Caret) {
        // Find the editor
        const editor = document.querySelector(
            `.editor[data-id="${caret.source.id}"]`,
        );
        if (editor === null) return undefined;

        // Is it a node? Position near it's top left.
        if (caret.position instanceof Node) {
            const view = editor.querySelector(
                `.node-view[data-id="${caret.position.id}"]`,
            );
            if (view == null) return undefined;
            const rect = view.getBoundingClientRect();
            return {
                left: rect.left,
                top: rect.bottom,
            };
        }
        // Is it a position? Position at the bottom right of the caret.
        else if (caret.isIndex()) {
            // Find the position of the caret in the editor.
            const view = editor.querySelector('.caret');
            if (view === null) return undefined;
            const rect = view.getBoundingClientRect();
            return {
                left: rect.left,
                top: rect.bottom,
            };
        }
    }

    function toggleTile(tile: Tile) {
        setMode(
            tile,
            tile.mode === Mode.Expanded ? Mode.Collapsed : Mode.Expanded,
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
    }

    function removeSource(source: Source) {
        Projects.reviseProject(project.withoutSource(source));
    }

    function renameSource(id: string, name: string) {
        if (!isName(name)) return;
        const source = getSourceByTileID(id);
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
            requestedPlay = false;
            setMode(main, Mode.Expanded);
            layout = layout.withoutFullscreen();
        }
    }

    function revert() {
        if (original) Projects.reviseProject(original);
    }

    /** Copy the project, make it private, track it, then gotoProject(). */
    function copy() {
        const copy = project.copy().asPublic(false);
        Projects.track(copy, true, PersistenceType.Online, false);
        goto(copy.getLink(false));
    }
</script>

<svelte:head><title>Wordplay - {project.getName()}</title></svelte:head>

<svelte:window
    on:keydown={handleKey}
    on:keyup={handleKeyUp}
    on:pointermove={handlePointerMove}
    on:pointerup={handlePointerUp}
    on:focus={resetKeyModifiers}
    on:blur={resetKeyModifiers}
/>

{#if warn}
    <Moderation {project} />
{/if}
<!-- Render the app header and the current project, if there is one. -->
<main class="project" class:dragging={$dragged !== undefined} bind:this={view}>
    <div
        class="canvas"
        class:free={$arrangement === Arrangement.Free}
        on:pointerdown|stopImmediatePropagation|stopPropagation={handlePointerDown}
        on:pointerup={handlePointerUp}
        on:pointermove={handlePointerMove}
        on:transitionend={repositionFloaters}
        on:scroll={repositionFloaters}
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
                <div class="empty">⬇</div>
            {:else}
                <!-- Lay out each of the tiles according to its specification, in order if in free layout, but in layout order if not. -->
                {#each $arrangement === Arrangement.Free ? layout.tiles : layout.getTilesInReadingOrder() as tile (tile.id)}
                    {#if tile.isExpanded() && (layout.fullscreenID === undefined || layout.fullscreenID === tile.id)}
                        <TileView
                            {project}
                            {tile}
                            {layout}
                            {editable}
                            arrangement={$arrangement}
                            background={tile.kind === TileKind.Output
                                ? outputBackground
                                : null}
                            dragging={draggedTile?.id === tile.id}
                            fullscreenID={layout.fullscreenID}
                            focuscontent={tile.kind === TileKind.Source ||
                                tile.kind === TileKind.Output}
                            on:mode={(event) =>
                                setMode(tile, event.detail.mode)}
                            on:position={(event) =>
                                positionTile(tile, event.detail.position)}
                            on:resize={(event) =>
                                resizeTile(
                                    event.detail.id,
                                    event.detail.direction,
                                    event.detail.left,
                                    event.detail.top,
                                )}
                            on:scroll={repositionFloaters}
                            on:rename={(event) =>
                                renameSource(
                                    event.detail.id,
                                    event.detail.name,
                                )}
                            on:fullscreen={(event) => {
                                if (
                                    layout.isFullscreen() &&
                                    tile.kind === TileKind.Output
                                )
                                    stopPlaying();
                                setFullscreen(
                                    event.detail.fullscreen ? tile : undefined,
                                );
                            }}
                        >
                            <svelte:fragment slot="name">
                                {#if tile.isSource()}
                                    {@const source = getSourceByTileID(tile.id)}
                                    <!-- Can't delete main. -->
                                    {#if editable && source !== project.getMain()}
                                        <ConfirmButton
                                            tip={$locales.get(
                                                (l) =>
                                                    l.ui.source.confirm.delete
                                                        .description,
                                            )}
                                            action={() => removeSource(source)}
                                            prompt={$locales.get(
                                                (l) =>
                                                    l.ui.source.confirm.delete
                                                        .prompt,
                                            )}>⨉</ConfirmButton
                                        >
                                    {/if}
                                {/if}
                            </svelte:fragment>
                            <svelte:fragment slot="extra">
                                <!-- Put some extra buttons in the output toolbar -->
                                {#if tile.kind === TileKind.Output}
                                    <CommandButton command={Restart} />
                                    {#if requestedPlay}<Button
                                            uiid="editProject"
                                            tip={$locales.get(
                                                (l) =>
                                                    l.ui.page.projects.button
                                                        .editproject,
                                            )}
                                            action={() => stopPlaying()}
                                            ><Emoji>🔎</Emoji></Button
                                        >{/if}
                                    <!-- {#if !$evaluation.evaluator.isPlaying()}
                                    <Painting
                                            bind:painting
                                        />{/if} -->
                                    <Toggle
                                        tips={$locales.get(
                                            (l) => l.ui.output.toggle.grid,
                                        )}
                                        on={grid}
                                        toggle={() => (grid = !grid)}
                                        ><Emoji>▦</Emoji></Toggle
                                    ><Toggle
                                        tips={$locales.get(
                                            (l) => l.ui.output.toggle.fit,
                                        )}
                                        on={fit}
                                        toggle={() => (fit = !fit)}
                                        ><Emoji
                                            >{#if fit}🔒{:else}🔓{/if}</Emoji
                                        ></Toggle
                                    >
                                {:else if tile.isSource()}
                                    <Switch
                                        onLabel={withVariationSelector('🖱️')}
                                        onTip={$locales.get(
                                            (l) =>
                                                l.ui.source.toggle.blocks.off,
                                        )}
                                        offLabel={withVariationSelector('⌨️')}
                                        offTip={$locales.get(
                                            (l) => l.ui.source.toggle.blocks.on,
                                        )}
                                        toggle={toggleBlocks}
                                        on={$blocks}
                                    />
                                    <Switch
                                        onLabel={$locales.getLocale().language}
                                        onTip={$locales.get(
                                            (l) =>
                                                l.ui.source.toggle.localized.on,
                                        )}
                                        offLabel={withVariationSelector('🌎')}
                                        offTip={$locales.get(
                                            (l) =>
                                                l.ui.source.toggle.localized
                                                    .off,
                                        )}
                                        toggle={(on) =>
                                            Settings.setLocalized(on)}
                                        on={$localized}
                                    />
                                    <!-- Make a Button for every modify command -->
                                    {#each VisibleModifyCommands as command}<CommandButton
                                            {command}
                                            sourceID={tile.id}
                                        />{/each}
                                {/if}
                            </svelte:fragment>
                            <svelte:fragment slot="content">
                                {#if tile.kind === TileKind.Documentation}
                                    <Documentation {project} />
                                {:else if tile.kind === TileKind.Palette}
                                    <Palette {project} {editable} />
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
                                        {editable}
                                    />
                                    <!-- Show an editor, annotations, and a mini output view -->
                                {:else}
                                    {@const source = getSourceByTileID(tile.id)}
                                    <div class="annotated-editor">
                                        <Editor
                                            {project}
                                            evaluator={$evaluator}
                                            {source}
                                            {editable}
                                            sourceID={tile.id}
                                            selected={source === selectedSource}
                                            autofocus={autofocus &&
                                                tile.isExpanded() &&
                                                getSourceByTileID(tile.id) ===
                                                    project.getMain()}
                                            bind:menu
                                            on:conflicts={(event) =>
                                                (conflictsOfInterest =
                                                    conflictsOfInterest.set(
                                                        event.detail.source,
                                                        event.detail.conflicts,
                                                    ))}
                                            on:preview={() =>
                                                (selectedSourceIndex =
                                                    getSourceIndexByID(
                                                        tile.id,
                                                    ))}
                                        />
                                    </div>
                                {/if}</svelte:fragment
                            ><svelte:fragment slot="footer"
                                >{#if tile.kind === TileKind.Source}
                                    <GlyphChooser
                                        sourceID={tile.id}
                                    />{:else if tile.kind === TileKind.Output && layout.fullscreenID !== tile.id && !requestedPlay && !showOutput}
                                    <Timeline
                                        evaluator={$evaluator}
                                    />{/if}</svelte:fragment
                            ><svelte:fragment slot="margin"
                                >{#if tile.kind === TileKind.Source}
                                    <Annotations
                                        {project}
                                        evaluator={$evaluator}
                                        source={getSourceByTileID(tile.id)}
                                        sourceID={tile.id}
                                        conflicts={visibleConflicts}
                                        stepping={$evaluation.playing === false}
                                        caret={$editors.get(tile.id)?.caret}
                                    />{/if}</svelte:fragment
                            ></TileView
                        >
                    {/if}
                {/each}
            {/if}
        {/key}
    </div>

    {#if !layout.isFullscreen() && !requestedPlay}
        <nav class="footer">
            {#if original}<Button
                    uiid="revertProject"
                    tip={$locales.get((l) => l.ui.project.button.revert)}
                    active={!project.equals(original)}
                    action={() => revert()}>↺</Button
                >{/if}
            {#if !editable}
                <Button
                    tip={$locales.get((l) => l.ui.project.button.duplicate)}
                    action={copy}><span class="copy">✐+</span></Button
                >
                {@const owner = project.getOwner()}
                {#if owner}
                    {#await Creators.getCreator(owner)}
                        <Spinning label="" />
                    {:then creator}
                        <CreatorView {creator} />
                    {/await}
                {/if}
            {:else}
                {#if shareable}
                    <Dialog
                        description={$locales.get((l) => l.ui.dialog.share)}
                        button={{
                            tip: $locales.get(
                                (l) => l.ui.project.button.showCollaborators,
                            ),
                            icon: project.isPublic()
                                ? isFlagged(project.getFlags())
                                    ? '‼️'
                                    : '🌐'
                                : '🤫',
                            label: project.isPublic()
                                ? $locales.get(
                                      (l) => l.ui.dialog.share.mode.public,
                                  ).modes[1]
                                : $locales.get((l) => l.ui.dialog.share).mode
                                      .public.modes[0],
                        }}
                    >
                        <Collaborators {project} />
                    </Dialog>
                {/if}
                <Button
                    tip={$locales.get((l) => l.ui.project.button.copy)}
                    action={() => toClipboard(project.toWordplay())}
                    ><Emoji>📋</Emoji></Button
                >
            {/if}

            {#if editable}<TextField
                    text={project.getName()}
                    description={$locales.get(
                        (l) => l.ui.project.field.name.description,
                    )}
                    placeholder={$locales.get(
                        (l) => l.ui.project.field.name.placeholder,
                    )}
                    changed={(name) =>
                        Projects.reviseProject(project.withName(name))}
                />{:else}{project.getName()}{/if}
            <Separator />
            {#each project.getSources() as source, index}
                {@const tile = layout.getTileWithID(Layout.getSourceID(index))}
                {#if tile}
                    <!-- Mini source view output is visible when collapsed, or if its main, when output is collapsed. -->
                    <SourceTileToggle
                        {source}
                        expanded={tile.mode === Mode.Expanded}
                        on:toggle={() => toggleTile(tile)}
                    />
                {/if}
            {/each}
            {#if editable}
                <Button
                    uiid="addSource"
                    tip={$locales.get((l) => l.ui.project.button.addSource)}
                    action={addSource}>+</Button
                >{/if}
            {#if overwritten}
                <span class="overwritten"
                    >{$locales.get((l) => l.ui.source.overwritten)}</span
                >
            {/if}
            <Separator />
            {#each layout.getNonSources() as tile}
                <NonSourceTileToggle
                    {project}
                    {tile}
                    on:toggle={() => toggleTile(tile)}
                />
            {/each}
            <ProjectLanguages {project} />
            <span class="help">
                <Dialog
                    description={$locales.get((l) => l.ui.dialog.help)}
                    button={{
                        tip: $locales.get(ShowKeyboardHelp.description),
                        icon: ShowKeyboardHelp.symbol,
                        label: '',
                    }}><Help /></Dialog
                >
            </span>
            <Toggle
                tips={$locales.get((l) => l.ui.tile.toggle.fullscreen)}
                on={browserFullscreen}
                command={browserFullscreen ? ExitFullscreen : EnterFullscreen}
                toggle={() => setBrowserFullscreen(!browserFullscreen)}
            >
                <FullscreenIcon />
            </Toggle>
        </nav>

        <!-- Render the menu on top of the annotations -->
        {#if menu && menuPosition}
            <Menu bind:menu hide={hideMenu} position={menuPosition} />
        {/if}

        <!-- Render the dragged node over the whole project -->
        {#if $dragged !== undefined}
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
                    node={$dragged}
                    spaces={project.getSourceOf($dragged)?.spaces}
                    localized
                />
                <div class="cursor">🐲</div>
            </div>
        {/if}
    {/if}

    <!-- Render a live region with announcements -->
    <Announcer bind:announce />
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
    }

    /** If in free layout mode, allow scrolling of content */
    .canvas.free {
        overflow: auto;
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
    }

    /* A fancy dragon cursor for dragon drop! Get it? */
    .cursor {
        position: absolute;
        font-size: 2rem;
        top: -1.5rem;
        left: -1.5rem;
        font-family: 'Noto Emoji';
        z-index: 2;
    }

    .empty {
        width: 100%;
        height: 100%;
        color: var(--wordplay-border-color);
        font-size: 1000%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .annotated-editor {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
    }

    .help {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .copy {
        display: inline-block;
        background: var(--wordplay-highlight-color);
        color: var(--wordplay-background);
        border-radius: var(--wordplay-border-radius);
        padding-inline-start: var(--wordplay-spacing);
        padding-inline-end: var(--wordplay-spacing);
        user-select: none;
    }

    .footer {
        border-bottom: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
        overflow-x: auto;
    }

    .overwritten {
        display: inline-block;
        background: var(--wordplay-error);
        color: var(--wordplay-background);
        padding-inline-start: var(--wordplay-spacing);
        padding-inline-end: var(--wordplay-spacing);
        border-radius: var(--wordplay-border-radius);
        white-space: nowrap;
    }
</style>
