<script context="module" lang="ts">
    export const PROJECT_PARAM_PLAY = 'play';
    export const PROJECT_PARAM_CONCEPT = 'concept';

    export const TYPING_DELAY = 300;
</script>

<script lang="ts">
    import { onDestroy, setContext, tick } from 'svelte';
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
    import Layout, { DocsID, OutputID, PaletteID } from './Layout';
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
    import Painting from '../output/Painting.svelte';
    import type PaintingConfiguration from '../output/PaintingConfiguration';
    import {
        DB,
        locale,
        locales,
        arrangement,
        languages,
        camera,
        mic,
        Settings,
        Projects,
        writingLayout,
        writingDirection,
        blocks,
    } from '../../db/Database';
    import Arrangement from '../../db/Arrangement';
    import {
        DOCUMENTATION_SYMBOL,
        EDIT_SYMBOL,
        PALETTE_SYMBOL,
        STAGE_SYMBOL,
    } from '../../parser/Symbols';
    import type Value from '../../values/Value';
    import {
        ShowKeyboardHelp,
        VisibleModifyCommands,
        handleKeyCommand,
    } from '../editor/util/Commands';
    import CommandButton from '../widgets/CommandButton.svelte';
    import Help from './Help.svelte';
    import type Color from '../../output/Color';
    import ProjectLanguages from './ProjectLanguages.svelte';
    import gotoProject from '../app/gotoProject';
    import Collaborators from './Collaborators.svelte';
    import Toggle from '../widgets/Toggle.svelte';
    import Announcer from './Announcer.svelte';
    import { toClipboard } from '../editor/util/Clipboard';
    import { PersistenceType } from '../../db/ProjectHistory';

    export let project: Project;
    export let original: Project | undefined = undefined;
    /** If false, then all things editable are deactivated */
    export let editable = true;
    /** If set to false, only the output is shown initially. */
    export let playing = false;
    /** True if the output should be fit to content */
    export let fit = true;
    /** True if the project should focus the main editor source on mount */
    export let autofocus = true;
    /** True if the editor should show help on an empty main source file*/
    export let showHelp = true;
    /** True if the project was overwritten by another instance of Wordplay */
    export let overwritten = false;

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
    let help = false;

    /** Whether to show the collaborators dialog */
    let collaborators = false;

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

    /** The conflicts present in the current project. **/
    const conflicts: ConflictsContext = writable([]);

    /** Keep the project in a store so we can derive other stores from it. */
    let projectStore = writable<Project>(project);
    $: if ($projectStore !== project) projectStore.set(project);

    /** Keep a project view global store indicating whether the creator is idle. */
    const keyboardEditIdle = writable<IdleKind>(IdleKind.Idle);
    setContext(KeyboardEditIdleSymbol, keyboardEditIdle);
    let keyboardIdleTimeout: NodeJS.Timeout | undefined = undefined;

    // When keyboard edit idle changes to true, set a timeout
    // to reset it to false after a delay.
    $: {
        if ($keyboardEditIdle !== IdleKind.Idle) {
            if (keyboardIdleTimeout) clearTimeout(keyboardIdleTimeout);
            keyboardIdleTimeout = setTimeout(
                () => keyboardEditIdle.set(IdleKind.Idle),
                500
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
                    (output): output is Evaluate => output instanceof Evaluate
                );
        }
    );
    const selectedPhrase: SelectedPhraseContext = writable(null);

    setContext<SelectedOutputPathsContext>(
        SelectedOutputPathsSymbol,
        selectedOutputPaths
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
                TYPING_DELAY
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
            true,
            replayInputs ? $evaluator : undefined
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
        getEvaluationContext()
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
        new Set()
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
                newTiles.push(tile);
            } else {
                const source = project
                    .getSources()
                    .find((_, index) => Layout.getSourceID(index) === tile.id);
                if (source)
                    newTiles.push(
                        tile
                            .withName(
                                source.names.getPreferredNameString($locales)
                            )
                            // If playing, keep the source files collapsed
                            .withMode(playing ? Mode.Collapsed : tile.mode)
                    );
            }
        }

        // Go through each source file and find the tile. If we don't find one, create one.
        let index = 0;
        for (const source of project.getSources()) {
            const tile = tiles.find(
                (tile) => tile.id === Layout.getSourceID(index)
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
            source.names.getPreferredNameString($locales),
            TileKind.Source,
            index === 0 || expandNewTile ? Mode.Expanded : Mode.Collapsed,
            undefined,
            Tile.randomPosition(1024, 768)
        );
    }

    function initializedLayout() {
        const persistedLayout = Settings.getProjectLayout(project.id);
        return persistedLayout === null
            ? null
            : persistedLayout.withTiles(syncTiles(persistedLayout.tiles));
    }

    /** Compute a default layout, or a new layout when the languages change. */
    let layout: Layout;
    $: {
        layout =
            (!layoutInitialized || layout.projectID !== project.id
                ? initializedLayout()
                : null) ??
            new Layout(
                project.id,
                layout
                    ? syncTiles(layout.tiles)
                    : // Create a layout in reading order.
                      [
                          new Tile(
                              PaletteID,
                              PALETTE_SYMBOL,
                              TileKind.Palette,
                              Mode.Collapsed,
                              undefined,
                              Tile.randomPosition(1024, 768)
                          ),
                          new Tile(
                              OutputID,
                              STAGE_SYMBOL,
                              TileKind.Output,
                              Mode.Expanded,
                              undefined,
                              Tile.randomPosition(1024, 768)
                          ),
                          new Tile(
                              DocsID,
                              DOCUMENTATION_SYMBOL,
                              TileKind.Documentation,
                              Mode.Collapsed,
                              undefined,
                              Tile.randomPosition(1024, 768)
                          ),
                          ...project.getSources().map((source, index) =>
                              // If playing, collapse the source initially.
                              createSourceTile(source, index).withMode(
                                  playing &&
                                      (index === 0 || source === newSource)
                                      ? Mode.Collapsed
                                      : Mode.Expanded
                              )
                          ),
                      ],
                layout ? layout.fullscreenID : undefined
            );

        if (
            !layoutInitialized &&
            $page.url.searchParams.get(PROJECT_PARAM_PLAY) !== null
        ) {
            const output = layout.getOutput();
            if (output) setFullscreen(output, true);
        }

        layoutInitialized = true;
    }

    /** Persist the layout when it changes */
    $: Settings.setProjectLayout(project.id, layout);

    /** When the layout or path changes, add or remove query params based on state */
    $: {
        const searchParams = new URLSearchParams($page.url.searchParams);

        if (layout.fullscreenID === TileKind.Output)
            searchParams.set(PROJECT_PARAM_PLAY, '');
        else searchParams.delete(PROJECT_PARAM_PLAY);

        // Set the URL to reflect the latest concept selected.
        if ($path.length > 0) {
            const concept = $path[$path.length - 1];
            const name = concept.getName($locale, false);
            const ownerName = $index
                ?.getConceptOwner(concept)
                ?.getName($locale, false);

            searchParams.set(
                PROJECT_PARAM_CONCEPT,
                `${ownerName ? `${ownerName}/` : ''}${name}`
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
        font: $locale.ui.font.app,
    };

    /** Set up project wide concept index and path context */
    export let index: ConceptIndexContext = writable(
        ConceptIndex.make(project, $locales)
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
        if (concept) path.set([concept]);
    }

    let latestProject: Project | undefined;

    // When the project changes, languages change, and the keyboard is idle, recompute the concept index.
    $: if ($keyboardEditIdle && latestProject !== project) {
        latestProject = project;

        // Make a new concept index with the new project and translations, but the old examples.
        const newIndex =
            project && $index
                ? ConceptIndex.make(project, $locales).withExamples(
                      $index.examples
                  )
                : undefined;

        // Set the index
        index.set(newIndex);

        // Map the old path to the new one using concept equality.
        path.set(
            $index
                ? $path
                      .map((concept) => $index?.getEquivalent(concept))
                      .filter((c): c is Concept => c !== undefined)
                : []
        );

        // Ensure the selected source index is in bounds.
        selectedSourceIndex = Math.min(
            selectedSourceIndex,
            project.supplements.length
        );
    }

    // When the path changes, show the docs and mirror the concept in the URL.
    let latestPath: Concept[] = $path;
    $: {
        if (
            $path.length !== latestPath.length ||
            !$path.every((concept, index) =>
                concept.isEqualTo(latestPath[index])
            )
        ) {
            const docs = layout.getDocs();
            if (docs) setMode(docs, Mode.Expanded);
        }
        // Update the latest path.
        latestPath = $path;
    }

    /** Build a list of visible conflicts of interest based on what tiles are expanded. */
    $: visibleConflicts = Array.from(conflictsOfInterest.keys())
        // Get the list of sources that are expanded
        .filter(
            (source) =>
                layout.getSource(project.getIndexOfSource(source))?.mode ===
                Mode.Expanded
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

    /** When the program steps language changes, get the latest value of the program's evaluation. */
    $: {
        $evaluation;
        $languages;
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
            (tile) => tile.id === Layout.getSourceID(index)
        );
        if (tile && tile.isCollapsed()) hideMenu();
    }

    /** If the camera or mic changes, restart the evaluator to reflect to the new stream. */
    const cameraUnsubscribe = camera.subscribe(() =>
        Projects.reviseProject(project.clone(), false)
    );
    const micUnsubscribe = mic.subscribe(() =>
        Projects.reviseProject(project.clone(), false)
    );

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
        /** After each update, measure an outline of the node view in the drag container. */
        const nodeView = dragContainer?.querySelector('.node-view');
        if (nodeView instanceof HTMLElement && $blocks === false)
            outline = {
                types: ['dragging'],
                outline: getOutlineOf(
                    nodeView,
                    $writingDirection === 'rtl' ||
                        $writingLayout === 'vertical-rl',
                    $writingDirection === 'rtl'
                ),
                underline: getUnderlineOf(
                    nodeView,
                    $writingDirection === 'rtl' ||
                        $writingLayout === 'vertical-rl',
                    $writingDirection === 'rtl'
                ),
            };
    });

    function toggleBlocks() {
        Settings.setBlocks(!$blocks);
    }

    function getTileView(tileID: string) {
        return view?.querySelector(`.tile[data-id="${tileID}"]`) ?? null;
    }

    function focusTile(focusedTileID: string | undefined) {
        if (view === undefined || view === null) return;

        const firstTileID = layout.tiles.find(
            (tile) => !tile.isCollapsed()
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
                '[data-defaultfocus]'
            )[0];
            if (defaultFocus instanceof HTMLElement) viewToFocus = defaultFocus;
            else {
                const focusable = tileView.querySelectorAll(
                    'input, button, [tabindex="0"]'
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
                (source) => source.id === currentTile.id
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

    async function setFullscreen(tile: Tile, fullscreen: boolean) {
        layout = fullscreen
            ? layout.withFullscreen(tile.id)
            : layout.withoutFullscreen();
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
        top: number
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

    function getSourceByID(id: string) {
        return project.getSources()[getSourceIndexByID(id)];
    }

    function fullscreen(on: boolean) {
        if (on) {
            layout = layout.isFullscreen()
                ? layout.withoutFullscreen()
                : layout.withFullscreen(OutputID);
            view?.focus();
        } else {
            layout = layout.withoutFullscreen();
        }
    }

    $: commandContext = {
        // Send the active caret, unless a non-source tile is fullscreen
        caret: layout.isFullscreenNonSource()
            ? undefined
            : (
                  Array.from($editors.values()).find(
                      (editor) => editor.focused
                  ) ?? Array.from($editors.values())[0]
              )?.caret,
        /** We intentionally depend on the evaluation store because it updates when the evaluator's state changes */
        evaluator: $evaluation.evaluator,
        dragging: $dragged !== undefined,
        database: DB,
        fullscreen,
        focusOrCycleTile,
        resetInputs,
        toggleBlocks,
        help: () => (help = !help),
    };
    const commandContextStore = writable(commandContext);
    $: commandContextStore.set(commandContext);
    setContext(ProjectCommandContextSymbol, commandContextStore);

    function handleKey(event: KeyboardEvent) {
        if ($dragged !== undefined && event.key === 'Escape')
            dragged.set(undefined);

        // See if there's a command that matches...
        const [, result] = handleKeyCommand(event, commandContext);

        // If something handled it, consume the event.
        if (result !== false) {
            event.stopPropagation();
            event.preventDefault();
        }
    }

    function getMenuPosition(caret: Caret) {
        // Find the editor
        const editor = document.querySelector(
            `.editor[data-id="${caret.source.id}"]`
        );
        if (editor === null) return undefined;

        // Is it a node? Position near it's top left.
        if (caret.position instanceof Node) {
            const view = editor.querySelector(
                `.node-view[data-id="${caret.position.id}"]`
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
            tile.mode === Mode.Expanded ? Mode.Collapsed : Mode.Expanded
        );
    }

    function addSource() {
        const newProject = project.withNewSource(
            `${$locale.term.source}${project.supplements.length + 1}`
        );

        // Remember this new source so when we compute the new layout, we can remember to expand it initially.
        newSource = newProject.supplements.at(-1);

        // This will propogate back to a new project here, updating the UI.
        Projects.reviseProject(newProject);
    }

    function removeSource(source: Source) {
        Projects.reviseProject(project.withoutSource(source));
    }

    function renameSource(id: string, name: string) {
        if (!isName(name)) return;
        const source = getSourceByID(id);
        Projects.reviseProject(
            project.withSource(source, source.withName(name, $locales[0]))
        );
    }

    function stopPlaying() {
        const main = layout.getTileWithID(Layout.getSourceID(0));
        if (main) {
            playing = false;
            setMode(main, Mode.Expanded);
            layout = layout.withoutFullscreen();
        }
    }

    function revert() {
        if (original) Projects.reviseProject(original);
    }

    /** Copy the project, track it, then gotoProject(). */
    function copy() {
        const copy = project.copy();
        Projects.track(copy, true, PersistenceType.Online, false);
        gotoProject(copy, false);
    }
</script>

<svelte:head><title>Wordplay - {project.name}</title></svelte:head>

<svelte:window
    on:keydown={handleKey}
    on:pointermove={handlePointerMove}
    on:pointerup={handlePointerUp}
/>

<Collaborators bind:show={collaborators} {project} />
<Help bind:show={help} />
<!-- Render the app header and the current project, if there is one. -->
<main class="project" bind:this={view}>
    <div
        class="canvas"
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
                <div class="empty">⬇️</div>
            {:else}
                <!-- Lay out each of the tiles according to its specification, in order if in free layout, but in layout order if not. -->
                {#each $arrangement === Arrangement.Free ? layout.tiles : layout.getTilesInReadingOrder() as tile (tile.id)}
                    {#if tile.isExpanded() && (layout.fullscreenID === undefined || layout.fullscreenID === tile.id)}
                        <TileView
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
                                    event.detail.top
                                )}
                            on:scroll={repositionFloaters}
                            on:rename={(event) =>
                                renameSource(
                                    event.detail.id,
                                    event.detail.name
                                )}
                            on:fullscreen={(event) =>
                                setFullscreen(tile, event.detail.fullscreen)}
                        >
                            <svelte:fragment slot="name">
                                {#if tile.isSource()}
                                    {@const source = getSourceByID(tile.id)}
                                    <!-- Can't delete main. -->
                                    {#if editable && source !== project.main}
                                        <ConfirmButton
                                            tip={$locale.ui.source.confirm
                                                .delete.description}
                                            action={() => removeSource(source)}
                                            prompt={$locale.ui.source.confirm
                                                .delete.prompt}>⨉</ConfirmButton
                                        >
                                    {/if}
                                {/if}
                            </svelte:fragment>
                            <svelte:fragment slot="extra">
                                {#if tile.kind === TileKind.Output}
                                    {#if playing && editable}<Button
                                            uiid="editProject"
                                            tip={$locale.ui.page.projects.button
                                                .edit}
                                            action={() => stopPlaying()}
                                            >{EDIT_SYMBOL}</Button
                                        >{/if}
                                    {#if !$evaluation.evaluator.isPlaying()}<Painting
                                            bind:painting
                                        />{/if}<Toggle
                                        tips={$locale.ui.output.toggle.grid}
                                        on={grid}
                                        toggle={() => (grid = !grid)}>▦</Toggle
                                    ><Toggle
                                        tips={$locale.ui.output.toggle.fit}
                                        on={fit}
                                        toggle={() => (fit = !fit)}
                                        >{#if fit}🔒{:else}🔓{/if}</Toggle
                                    >
                                {:else if tile.isSource()}
                                    <Toggle
                                        tips={$locale.ui.source.toggle.blocks}
                                        on={$blocks}
                                        toggle={toggleBlocks}>▭</Toggle
                                    >
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
                                    {@const source = getSourceByID(tile.id)}
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
                                                getSourceByID(tile.id) ===
                                                    project.main}
                                            {showHelp}
                                            bind:menu
                                            on:conflicts={(event) =>
                                                (conflictsOfInterest =
                                                    conflictsOfInterest.set(
                                                        event.detail.source,
                                                        event.detail.conflicts
                                                    ))}
                                            on:preview={() =>
                                                (selectedSourceIndex =
                                                    getSourceIndexByID(
                                                        tile.id
                                                    ))}
                                        />
                                    </div>
                                {/if}</svelte:fragment
                            ><svelte:fragment slot="footer"
                                >{#if tile.kind === TileKind.Source}
                                    <Annotations
                                        {project}
                                        evaluator={$evaluator}
                                        source={getSourceByID(tile.id)}
                                        conflicts={visibleConflicts}
                                        stepping={$evaluation.playing === false}
                                    /><GlyphChooser
                                        sourceID={tile.id}
                                    />{:else if tile.kind === TileKind.Output && layout.fullscreenID !== tile.id && !playing}
                                    <Timeline
                                        evaluator={$evaluator}
                                    />{/if}</svelte:fragment
                            ></TileView
                        >
                    {/if}
                {/each}
            {/if}
        {/key}
    </div>

    {#if !layout.isFullscreen() && !playing}
        <nav class="footer">
            {#if original}<Button
                    uiid="revertProject"
                    tip={$locale.ui.project.button.revert}
                    active={!project.equals(original)}
                    action={() => revert()}>↺</Button
                >{/if}
            {#if !editable}
                <Button tip={$locale.ui.project.button.duplicate} action={copy}
                    ><span class="copy">✐+</span></Button
                >
            {:else}
                <Toggle
                    tips={$locale.ui.project.toggle.public}
                    toggle={() =>
                        Projects.reviseProject(
                            project.asPublic(!project.public)
                        )}
                    on={project.public}
                    >{#if project.public}🌐{:else}🤫{/if}</Toggle
                >
                <Button
                    tip={$locale.ui.project.button.showCollaborators}
                    action={() => (collaborators = true)}>🤝</Button
                >
                <Button
                    tip={$locale.ui.project.button.copy}
                    action={() => toClipboard(project.toWordplay())}>📚</Button
                >
            {/if}

            {#if editable}<TextField
                    text={project.name}
                    description={$locale.ui.project.field.name.description}
                    placeholder={$locale.ui.project.field.name.placeholder}
                    changed={(name) =>
                        Projects.reviseProject(project.withName(name))}
                />{:else}{project.name}{/if}
            {#each layout.getNonSources() as tile}
                <NonSourceTileToggle
                    {tile}
                    on:toggle={() => toggleTile(tile)}
                />
            {/each}
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
                    tip={$locale.ui.project.button.addSource}
                    action={addSource}>+</Button
                >{/if}
            {#if overwritten}
                <span class="overwritten">{$locale.ui.source.overwritten}</span>
            {/if}
            <span class="help">
                <ProjectLanguages {project} />
                <Button
                    tip={ShowKeyboardHelp.description($locale)}
                    action={() => (help = true)}
                    >{ShowKeyboardHelp.symbol}</Button
                ></span
            >
        </nav>

        <!-- Render the menu on top of the annotations -->
        {#if menu && menuPosition}
            <Menu bind:menu hide={hideMenu} position={menuPosition} />
        {/if}

        <!-- Render the dragged node over the whole project -->
        {#if $dragged !== undefined}
            <!-- Render the highlight underneath the code -->
            <div class="drag-outline">
                {#if outline}<Highlight {...outline} above={false} />{/if}
            </div>
            <div
                class="drag-container dragging"
                style="left: {pointerX}px; top:{pointerY}px;"
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
    }

    .drag-container {
        position: absolute;
        cursor: none;
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
        pointer-events: none;
    }

    /* .drag-container :global(.token-view) {
        color: var(--wordplay-background);
    } */

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
        margin-left: auto;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
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
