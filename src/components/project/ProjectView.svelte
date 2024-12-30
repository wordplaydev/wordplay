<script module lang="ts">
    import { type Template } from '@locale/LocaleText';
    import {
        type FieldText,
        type DialogText,
        type ButtonText,
    } from '@locale/UITexts';

    /** How long to wait until considering typing idle. */
    export const KeyboardIdleWaitTime = 500;

    export type ProjectText = {
        /** The error shown when a project ID is unknown. */
        error: {
            unknown: string;
            /** The error to show if translation wasn't possible */
            translate: string;
            /** The message for an error in a tile */
            tile: string;
            /** The button label for an error reset */
            reset: string;
        };
        button: {
            /** Shows the sharing dialog */
            share: ButtonText;
            /** Remove a collaborator that has been shared with */
            removeCollaborator: string;
            /** Copy the project as text to the clipboard */
            copy: string;
            /** Add a source file */
            addSource: string;
            /** Duplicate the project */
            duplicate: string;
            /** Revert project to original code */
            revert: string;
            /** Keyboard shortcut to focus output tile */
            focusOutput: string;
            /** Keyboard shortcut to focus source tiles */
            focusSource: string;
            /** Keyboard shortcut to focus documentation tile */
            focusDocs: string;
            /** Keyboard shortcut to focus palette tiles */
            focusPalette: string;
            /** Keyboard shortcut to cycle between tiles */
            focusCycle: string;
            /** Show save error button */
            unsaved: string;
            /** Show translation button */
            translate: ButtonText;
            /** The tooltip for the primary locale setting button */
            primary: string;
            /** The history switch */
            history: { off: string; on: string };
        };
        field: {
            /** The project name text field */
            name: FieldText;
        };
        /** The keyboard shortcut to show the shortcut menu */
        help: string;
        /** The text to show when all of the tiles are collapsed. */
        collapsed: string;
        /** The messages shown for save status */
        save: {
            /** When projects fail to save locally */
            projectsNotSavedLocally: Template;
            /** When projects can't save locally */
            projectsCannotNotSaveLocally: Template;
            /** When a project wasn't saved because it contained PII */
            projectContainedPII: Template;
            /** Projects failed to load */
            projectsNotLoadingOnline: Template;
            /** When a project couldn't be saved to the database */
            projectNotSavedOnline: Template;
            /** When settings are being saved */
            settingsUnsaved: Template;
        };
        dialog: {
            /** The header for the save error */
            unsaved: Template;
            /** The content for the translation dialog */
            translate: DialogText;
        };
        subheader: {
            /** The header for the source language */
            source: Template;
            /** The header for the destination language */
            destination: Template;
        };
    };
</script>

<!-- svelte-ignore state_referenced_locally -->
<script lang="ts">
    import { onDestroy, onMount, tick, untrack } from 'svelte';
    import { writable, type Writable } from 'svelte/store';
    import {
        type SelectedOutputContext,
        getConceptPath,
        IdleKind,
        type EditorState,
        type KeyModifierState,
        type SelectedOutputPaths,
        type SelectedPhrase,
        setConceptIndex,
        setDragged,
        setProjectCommandContext,
        setKeyboardEditIdle,
        setKeyboardModifiers,
        setEvaluation,
        setAnimatingNodes,
        setEditors,
        setConflicts,
        setSelectedOutputContext,
        setAnnouncer,
        type AnnouncerContext,
        getFullscreen,
        getUser,
    } from './Contexts';
    import type Project from '@db/projects/Project';
    import Documentation from '@components/concepts/Documentation.svelte';
    import Annotations from '../annotations/Annotations.svelte';
    import type Conflict from '@conflicts/Conflict';
    import RootView from './RootView.svelte';
    import Highlight from '../editor/Highlight.svelte';
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
    import Source from '@nodes/Source';
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
        animationFactor,
        Chats,
    } from '../../db/Database';
    import Arrangement from '../../db/settings/Arrangement';
    import type Value from '../../values/Value';
    import {
        EnterFullscreen,
        ExitFullscreen,
        Restart,
        ShowKeyboardHelp,
        VisibleModifyCommands,
        VisibleNavigateCommands,
        handleKeyCommand,
        type CommandContext,
    } from '../editor/util/Commands';
    import CommandButton from '../widgets/CommandButton.svelte';
    import Shortcuts from './Shortcuts.svelte';
    import type Color from '../../output/Color';
    import Sharing from './Sharing.svelte';
    import Toggle from '../widgets/Toggle.svelte';
    import Announcer from './Announcer.svelte';
    import { toClipboard } from '../editor/util/Clipboard';
    import Spinning from '../app/Spinning.svelte';
    import CreatorView from '../app/CreatorView.svelte';
    import Moderation from './Moderation.svelte';
    import { isFlagged } from '../../db/projects/Moderation';
    import Dialog from '../widgets/Dialog.svelte';
    import Separator from './Separator.svelte';
    import Emoji from '../app/Emoji.svelte';
    import {
        PROJECT_PARAM_CONCEPT,
        PROJECT_PARAM_EDIT,
        PROJECT_PARAM_PLAY,
    } from '../../routes/project/constants';
    import Switch from '@components/widgets/Switch.svelte';
    import { withMonoEmoji } from '../../unicode/emoji';
    import FullscreenIcon from './FullscreenIcon.svelte';
    import Glyphs from '../../lore/Glyphs';
    import Speech from '@components/lore/Speech.svelte';
    import Translate from './Translate.svelte';
    import { AnimationFactorIcons } from '@db/settings/AnimationFactorSetting';
    import { CANCEL_SYMBOL, COPY_SYMBOL } from '@parser/Symbols';
    import CopyButton from './CopyButton.svelte';
    import { localeToString } from '@locale/Locale';
    import type Locale from '@locale/Locale';
    import { default as ModeChooser } from '@components/widgets/Mode.svelte';
    import OutputLocaleChooser from './OutputLocaleChooser.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import CollaborateView from '@components/app/chat/CollaborateView.svelte';
    import type Chat from '@db/ChatDatabase.svelte';
    import Checkpoints from './Checkpoints.svelte';
    import { parseNames } from '@parser/parseBind';
    import Link from '@components/app/Link.svelte';

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
    }

    let {
        project,
        original = undefined,
        editable = true,
        showOutput = false,
        fit = true,
        autofocus = true,
        overwritten = false,
        warn = true,
        shareable = true,
        dragged = $bindable(undefined),
        index = $bindable(undefined),
        persistLayout = true,
    }: Props = $props();

    // The HTMLElement that represents this element
    let view = $state<HTMLElement | undefined>(undefined);

    // The conflicts of interest in each editor, used to generate annotations.
    let conflictsOfInterest = $state<Map<Source, Conflict[]>>(new Map());

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

    /** The current canvas dimensions */
    let canvasWidth = $state(1024);
    let canvasHeight = $state(768);

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
        $page.url.searchParams.get(PROJECT_PARAM_PLAY) !== null,
    );
    let requestedEdit = $state(
        $page.url.searchParams.get(PROJECT_PARAM_EDIT) !== null,
    );

    const user = getUser();

    /** The fullscreen context of the page that this is in. */
    const pageFullscreen = getFullscreen();

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

    /**
     * Create a project global context that stores the current selected value (and if not in an editing mode, nothing).
     * This enables output views like phrases and groups know what mode the output view is in and whether they are selected.
     * so they can render selected feedback.
     */
    let selectedOutputPaths: SelectedOutputPaths = $state<SelectedOutputPaths>(
        [],
    );
    const selectedOutput: Evaluate[] = $derived(
        selectedOutputPaths
            .map(({ source, path }) => {
                if (
                    source === undefined ||
                    path === undefined ||
                    $projectStore === undefined
                )
                    return undefined;
                const name = source.getNames()[0];
                if (name === undefined) return undefined;
                const newSource = $projectStore.getSourceWithName(name);
                if (newSource === undefined) return undefined;
                return newSource.root.resolvePath(path);
            })
            .filter((output): output is Evaluate => output instanceof Evaluate),
    );
    let selectedPhrase = $state<SelectedPhrase>(null);

    function setSelectedOutput(project: Project, evaluates: Evaluate[]) {
        // Map each selected output to its replacement, then set the selected output to the replacements.
        selectedOutputPaths = evaluates.map((output) => {
            return {
                source: project.getSourceOf(output),
                path: project.getRoot(output)?.getPath(output),
            };
        });
    }

    function setSelectedPhrase(phrase: SelectedPhrase) {
        selectedPhrase = phrase;
    }

    let selectionState = $state<SelectedOutputContext>({
        selectedPaths: [],
        selectedOutput: [],
        selectedPhrase: null,
        setSelectedOutput,
        setSelectedPhrase,
    });

    $effect(() => {
        selectionState.selectedOutput = selectedOutput;
        selectionState.selectedPaths = selectedOutputPaths;
        selectionState.selectedPhrase = selectedPhrase;
        selectionState.setSelectedOutput = setSelectedOutput;
        selectionState.setSelectedPhrase = setSelectedPhrase;
    });

    setSelectedOutputContext(selectionState);

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
    let evaluatorTimeout = $state<NodeJS.Timeout | undefined>();
    projectStore.subscribe((newProject) => {
        if ($keyboardEditIdle === IdleKind.Typing) {
            if (evaluatorTimeout) clearTimeout(evaluatorTimeout);
            evaluatorTimeout = setTimeout(
                () => updateEvaluator(newProject),
                KeyboardIdleWaitTime,
            );
        } else {
            updateEvaluator(newProject);
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
    }

    /** This stores the instance of the announcer component */
    let announce = $state<ReturnType<typeof Announcer>>();
    let announcerFunction: Writable<AnnouncerContext | undefined> =
        writable(undefined);

    // Update the function context when the announcer changes.
    $effect(() => announcerFunction.set(announce?.announce));

    // Set the announcer store in context.
    setAnnouncer(announcerFunction);

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

    // Clear the selected output upon playing.
    evaluation.subscribe((val) => {
        if (val.playing)
            if (selectedOutputPaths.length > 0) selectedOutputPaths = [];
    });

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
        for (const source of sources) {
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
                new Tile(
                    TileKind.Collaborate,
                    TileKind.Collaborate,
                    Mode.Collapsed,
                    undefined,
                    Tile.randomPosition(1024, 768),
                ),
                ...sources.map((source, index) =>
                    // If starting with output only, collapse the source initially too.
                    createSourceTile(source, index).withMode(
                        showOutput
                            ? Mode.Collapsed
                            : index === 0 || source === newSource
                              ? Mode.Expanded
                              : Mode.Collapsed,
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
                // If showing output was requested, we fullscreen on output
                showOutput ? TileKind.Output : undefined,
            )
        );
    }

    /** The current layout of the tile windows, starting with a serialized layout or a default. */
    let layout = $state<Layout>(getInitialLayout());

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
        const searchParams = new URLSearchParams($page.url.searchParams);

        if (!requestedPlay) searchParams.delete(PROJECT_PARAM_PLAY);
        if (!requestedEdit) searchParams.delete(PROJECT_PARAM_EDIT);

        // Set the URL to reflect the latest concept selected.
        if ($path && $path.length > 0) {
            const concept = $path[$path.length - 1];
            const name = concept.getName($locales, false);
            const ownerName = index
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
    });

    /** Persist the layout when it changes */
    $effect(() => {
        if (persistLayout) Settings.setProjectLayout(project.getID(), layout);
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

    /** Update the concept index whenever the project or locales change. */
    $effect(() => {
        index = ConceptIndex.make(project, $locales);
    });

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
    onMount(() => restoreConcept());

    function resolveConcept(conceptPath: string): Concept | undefined {
        if (conceptPath && index) {
            const [ownerName, name] = conceptPath.split('/');
            const concept =
                ownerName && name
                    ? index.getSubConcept(ownerName, name)
                    : index.getConceptByName(ownerName);
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
    $effect(() => {
        if ($keyboardEditIdle && latestProject !== project) {
            latestProject = project;

            // Make a new concept index with the new project and translations, but the old examples.
            const newIndex =
                project && index
                    ? ConceptIndex.make(project, $locales).withExamples(
                          index.examples,
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
    let latestPath = $state<Concept[]>($path ?? []);

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
                untrack(() => layout.isFullscreen()))
        ) {
            if (docs) {
                setFullscreen(undefined);
                setMode(docs, Mode.Expanded);
            }
        }
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
                        Mode.Expanded,
            )
            // Convert them into lists of conflicts
            .map((source) => conflictsOfInterest.get(source) ?? [])
            // Flatten the list
            .flat(),
    );

    /**
     * Any time the evaluator of the project changes, start it, and analyze it after some delay.
     * */
    let updateTimer = $state<NodeJS.Timeout | undefined>(undefined);
    $effect(() => {
        // Re-evaluate immediately if not started.
        if (!$evaluator.isStarted()) $evaluator.start();

        untrack(() => {
            if (updateTimer) clearTimeout(updateTimer);
        });

        function updateConflicts() {
            // In the middle of analyzing? Check later.
            if (project.analyzed === 'analyzing')
                setTimeout(updateConflicts, KeyboardIdleWaitTime);
            // Done analyzing, or not analyzed?
            else {
                // Analyze if not analyzed  yet.
                if (project.analyzed === 'unanalyzed') project.analyze();
                // Get the resulting conflicts.
                conflicts.set(project.getConflicts());
            }
        }

        updateTimer = setTimeout(updateConflicts, KeyboardIdleWaitTime);
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
            if (tile && tile.mode === Mode.Collapsed) {
                untrack(() => setMode(tile, Mode.Expanded));
            }
        }
    });

    /** When output selection changes, make the palette visible. */
    $effect(() => {
        const palette = untrack(() => layout).getPalette();
        if (palette) {
            if (selectedOutput && selectedOutput.length > 0) {
                if (palette.mode === Mode.Collapsed)
                    untrack(() => setMode(palette, Mode.Expanded));
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
            const index = sources.indexOf(menu.getCaret().source);
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
        menuPosition = menu ? getMenuPosition(menu.getCaret()) : undefined;
    });

    // When the locale direction changes, update the output.
    $effect(() => {
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
                if (announce?.announce) {
                    announce.announce(
                        project.getID(),
                        $locales.getLanguages()[0],
                        $locales.get((l) => l.ui.source.overwritten),
                    );
                }
            });
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

    function setMode(tile: Tile, mode: Mode) {
        if (layout.getTileWithID(tile.id)?.mode === mode) return;

        // Special case selected output and the palette.
        if (
            tile === layout.getPalette() &&
            selectedOutput &&
            selectedOutputPaths
        ) {
            if (tile.mode === Mode.Collapsed && selectedOutput.length === 0) {
                const output = project.getOutput();
                if (output.length > 0) {
                    setSelectedOutput(project, [output[0]]);
                    $evaluator.pause();
                }
            } else if (tile.mode === Mode.Expanded) {
                setSelectedOutput(project, []);
            }
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
        menuPosition = menu ? getMenuPosition(menu.getCaret()) : undefined;
    }

    function getSourceIndexByID(id: string) {
        return parseInt(id.replace('source', ''));
    }

    function getSourceByTileID(id: string) {
        return sources[getSourceIndexByID(id)];
    }

    function handleKey(event: KeyboardEvent) {
        syncKeyModifiers(event);

        if (dragged !== undefined && event.key === 'Escape')
            dragged = undefined;

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

        const project = document.querySelector('.project');
        if (project === null) return undefined;

        const projectBounds = project.getBoundingClientRect();

        // Is it a node? Position near it's top left.
        if (caret.position instanceof Node) {
            const view = editor.querySelector(
                `.node-view[data-id="${caret.position.id}"]`,
            );
            if (view == null) return undefined;
            const nodeBounds = view.getBoundingClientRect();
            return {
                left: nodeBounds.left - projectBounds.left,
                top: nodeBounds.bottom - projectBounds.top,
            };
        }
        // Is it a position? Position at the bottom right of the caret.
        else if (caret.isIndex()) {
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
</script>

<svelte:head><title>Wordplay - {project.getName()}</title></svelte:head>

<svelte:window
    onkeydown={handleKey}
    onkeyup={handleKeyUp}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onfocus={resetKeyModifiers}
    onblur={resetKeyModifiers}
/>

{#if warn}
    <Moderation {project} />
{/if}
<!-- Render a live region with announcements as soon as possible -->
<Announcer bind:this={announce} />
<!-- Render the current project. -->
<main class="project" class:dragging={dragged !== undefined} bind:this={view}>
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
                    <Speech glyph={Glyphs.Function}>
                        {#snippet content()}
                            {$locales.get((l) => l.ui.project.collapsed)} ⬇
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
                                            )}>{CANCEL_SYMBOL}</ConfirmButton
                                        >
                                    {/if}
                                {:else if tile.kind === TileKind.Output}
                                    <span
                                        title={$locales.get(
                                            (l) =>
                                                l.ui.dialog.settings.mode
                                                    .animate,
                                        ).modes[$animationFactor]}
                                    >
                                        <!-- <Emoji>{AnimationFactorIcons[$animationFactor]}</Emoji> -->
                                        {#if $animationFactor === 0}{$locales.get(
                                                (l) =>
                                                    l.ui.dialog.settings.mode
                                                        .animate,
                                            ).modes[0]}{/if}
                                    </span>
                                {/if}
                            {/snippet}

                            {#snippet extra()}
                                <!-- Put some extra buttons in the output toolbar -->
                                {#if tile.kind === TileKind.Output}
                                    {#if !editable}<CopyButton {project}
                                        ></CopyButton>{/if}
                                    {#if (requestedPlay || showOutput) && layout.isFullscreen()}<Button
                                            uiid="editProject"
                                            background
                                            padding={false}
                                            tip={$locales.get(
                                                (l) =>
                                                    l.ui.page.projects.button
                                                        .viewcode,
                                            )}
                                            action={() => stopPlaying()}
                                            ><Emoji>{withMonoEmoji('👁️')}</Emoji
                                            ></Button
                                        >{/if}
                                    <CommandButton
                                        background
                                        command={Restart}
                                    />
                                    {#if localesUsed.length > 1}<OutputLocaleChooser
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
                                        tips={$locales.get(
                                            (l) => l.ui.output.toggle.grid,
                                        )}
                                        on={grid}
                                        toggle={() => (grid = !grid)}
                                        ><Emoji>▦</Emoji></Toggle
                                    ><Toggle
                                        background
                                        tips={$locales.get(
                                            (l) => l.ui.output.toggle.fit,
                                        )}
                                        on={fit}
                                        toggle={() => (fit = !fit)}
                                        ><Emoji
                                            >{#if fit}🔒{:else}🔓{/if}</Emoji
                                        ></Toggle
                                    >
                                    <ModeChooser
                                        descriptions={$locales.get(
                                            (l) =>
                                                l.ui.dialog.settings.mode
                                                    .animate,
                                        )}
                                        choice={$animationFactor}
                                        select={(choice) =>
                                            Settings.setAnimationFactor(choice)}
                                        modes={AnimationFactorIcons}
                                        labeled={false}
                                    />
                                {:else if tile.isSource()}
                                    {#if !editable}<CopyButton {project}
                                        ></CopyButton>{/if}
                                    <Switch
                                        onLabel={withMonoEmoji('🖱️')}
                                        onTip={$locales.get(
                                            (l) =>
                                                l.ui.source.toggle.blocks.off,
                                        )}
                                        offLabel={withMonoEmoji('⌨️')}
                                        offTip={$locales.get(
                                            (l) => l.ui.source.toggle.blocks.on,
                                        )}
                                        toggle={toggleBlocks}
                                        on={$blocks}
                                    />
                                    <ModeChooser
                                        labeled={false}
                                        descriptions={$locales.get(
                                            (l) =>
                                                l.ui.dialog.settings.mode
                                                    .localized,
                                        )}
                                        choice={$localized === 'actual'
                                            ? 0
                                            : $localized === 'localized'
                                              ? 1
                                              : 2}
                                        select={(choice) =>
                                            Settings.setLocalized(
                                                choice === 0
                                                    ? 'actual'
                                                    : choice === 1
                                                      ? 'localized'
                                                      : 'symbolic',
                                            )}
                                        modes={[
                                            '...',
                                            localeToString(
                                                $locales.getLocale(),
                                            ),
                                            '😀',
                                        ]}
                                    />
                                    <!-- Make a Button for every navigate command -->
                                    {#each VisibleNavigateCommands as command}<CommandButton
                                            {command}
                                            sourceID={tile.id}
                                        />{/each}
                                    <!-- Make a Button for every modify command if editable -->
                                    {#if editable}
                                        {#each VisibleModifyCommands as command}<CommandButton
                                                {command}
                                                sourceID={tile.id}
                                            />{/each}
                                    {/if}
                                {/if}
                            {/snippet}
                            {#snippet content()}
                                {#if tile.kind === TileKind.Documentation}
                                    <Documentation {project} />
                                {:else if tile.kind === TileKind.Palette}
                                    <Palette
                                        {project}
                                        editable={editableAndCurrent}
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
                                    <div class="annotated-editor">
                                        <Editor
                                            {project}
                                            evaluator={$evaluator}
                                            {source}
                                            editable={editableAndCurrent}
                                            {overwritten}
                                            sourceID={tile.id}
                                            selected={source === selectedSource}
                                            autofocus={autofocus &&
                                                tile.isExpanded() &&
                                                getSourceByTileID(tile.id) ===
                                                    project.getMain()}
                                            bind:menu
                                            updateConflicts={(
                                                source,
                                                conflicts,
                                            ) => {
                                                conflictsOfInterest = new Map(
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
                                        />
                                    </div>
                                {/if}
                            {/snippet}
                            {#snippet footer()}
                                {#if tile.kind === TileKind.Source && editable}
                                    {#if editableAndCurrent}<GlyphChooser
                                            sourceID={tile.id}
                                        />{/if}
                                    {#if checkpoint > -1}
                                        <div class="editor-warning"
                                            >{$locales.get(
                                                (l) =>
                                                    l.ui.checkpoints.label
                                                        .restore,
                                            )}
                                            <Button
                                                background
                                                tip={$locales.get(
                                                    (l) =>
                                                        l.ui.checkpoints.button
                                                            .restore,
                                                )}
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
                                                >{$locales.get(
                                                    (l) =>
                                                        l.ui.checkpoints.button
                                                            .restore,
                                                )}</Button
                                            >
                                        </div>
                                    {/if}
                                    {#if $blocks}
                                        <div class="editor-warning"
                                            >This editing mode is experimental. <Link
                                                to="https://discord.gg/Jh2Qq9husy"
                                                >Discuss</Link
                                            > improvements.
                                        </div>
                                    {/if}
                                {:else if tile.kind === TileKind.Output && layout.fullscreenID !== tile.id && !requestedPlay && !showOutput}
                                    <Timeline evaluator={$evaluator} />{/if}
                            {/snippet}
                            {#snippet margin()}
                                {#if tile.kind === TileKind.Source && editable}
                                    <Annotations
                                        {project}
                                        evaluator={$evaluator}
                                        source={getSourceByTileID(tile.id)}
                                        sourceID={tile.id}
                                        conflicts={visibleConflicts}
                                        stepping={$evaluation.playing === false}
                                        caret={$editors.get(tile.id)?.caret}
                                    />{/if}
                            {/snippet}
                        </TileView>
                    {/if}
                {/each}
            {/if}
        {/key}
    </div>

    {#if !layout.isFullscreen() && !requestedPlay}
        {@const owner = project.getOwner()}
        <nav class="footer">
            <div class="footer-row">
                {#if original}<Button
                        uiid="revertProject"
                        tip={$locales.get((l) => l.ui.project.button.revert)}
                        active={!project.equals(original)}
                        action={() => revert()}>↺</Button
                    >{/if}
                <Button
                    tip={$locales.get((l) => l.ui.project.button.copy)}
                    action={() => toClipboard(project.toWordplay())}
                    ><Emoji>{COPY_SYMBOL}</Emoji></Button
                >
                {#if owner}
                    {#await Creators.getCreator(owner)}
                        <Spinning label="" />
                    {:then creator}
                        <CreatorView {creator} />
                    {/await}
                {/if}
                {#if editable}
                    <TextField
                        text={project.getName()}
                        description={$locales.get(
                            (l) => l.ui.project.field.name.description,
                        )}
                        placeholder={$locales.get(
                            (l) => l.ui.project.field.name.placeholder,
                        )}
                        changed={(name) =>
                            Projects.reviseProject(project.withName(name))}
                        max="10em"
                    />
                {:else}{project.getName()}{/if}
                {#each sources as source, index}
                    {@const tile = layout.getTileWithID(
                        Layout.getSourceID(index),
                    )}
                    {#if tile}
                        <!-- Mini source view output is visible when collapsed, or if its main, when output is collapsed. -->
                        <SourceTileToggle
                            {project}
                            {source}
                            expanded={tile.mode === Mode.Expanded}
                            toggle={() => toggleTile(tile)}
                        />
                    {/if}
                {/each}
                {#if editable && layout.hasVisibleCollapsedSource()}
                    <Separator />
                {/if}
                {#if editable}
                    <Button
                        uiid="addSource"
                        tip={$locales.get((l) => l.ui.project.button.addSource)}
                        action={addSource}
                        >+<Emoji>{Glyphs.Program.symbols}</Emoji></Button
                    >{/if}
                {#each layout.getNonSources() as tile}
                    <!-- No need to show the tile if not visible when not editable. -->
                    {#if tile.isVisibleCollapsed(editable)}
                        <NonSourceTileToggle
                            {project}
                            {tile}
                            on:toggle={() => toggleTile(tile)}
                            notification={tile.kind === TileKind.Collaborate &&
                                !!chat &&
                                $user !== null &&
                                chat.hasUnread($user.uid)}
                        />
                    {/if}
                {/each}
                <span class="right-align">
                    <Dialog
                        description={$locales.get((l) => l.ui.dialog.help)}
                        button={{
                            tip: $locales.get(ShowKeyboardHelp.description),
                            icon: ShowKeyboardHelp.symbol,
                            label: '',
                        }}><Shortcuts /></Dialog
                    >
                    <Toggle
                        tips={$locales.get((l) => l.ui.tile.toggle.fullscreen)}
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
                            description={$locales.get((l) => l.ui.dialog.share)}
                            button={{
                                tip: $locales.get(
                                    (l) => l.ui.project.button.share.tip,
                                ),
                                icon:
                                    project.isPublic() &&
                                    isFlagged(project.getFlags())
                                        ? '‼️'
                                        : '↗',
                                label: $locales.get(
                                    (l) => l.ui.project.button.share.label,
                                ),
                            }}
                        >
                            <Sharing {project} />
                        </Dialog>
                    {/if}
                    <Separator />
                    <Translate {project}></Translate>
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
                    localized={$localized}
                    blocks={$blocks}
                />
                <div class="cursor">🐲</div>
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
</style>
