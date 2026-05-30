<script module lang="ts">
    /** How long to wait until considering typing idle. */
    export const KeyboardIdleWaitTime = 500;
</script>

<!-- svelte-ignore state_referenced_locally -->
<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import Annotations from '@components/annotations/Annotations.svelte';
    import CollaborateView from '@components/app/chat/CollaborateView.svelte';
    import Emoji from '@components/app/Emoji.svelte';
    import { extractPreview } from '@components/app/extractPreview';
    import { getLocalizedProjectName } from '@db/projects/getLocalizedProjectName';
    import Documentation from '@components/concepts/Documentation.svelte';
    import {
        handleKeyCommand,
        Pause,
        Play,
        Restart,
        toShortcut,
        VisibleModifyCommands,
        VisibleNavigateCommands,
        type CommandContext,
    } from '@components/editor/commands/Commands';
    import GlyphInserter from '@components/editor/commands/GlyphInserter.svelte';
    import Highlight from '@components/editor/highlights/Highlight.svelte';
    import Menu from '@components/editor/menu/Menu.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Options from '@components/widgets/Options.svelte';
    import Tour, { type UIExplanation } from '@components/widgets/Tour.svelte';
    import type Concept from '@concepts/Concept';
    import ConceptIndex from '@concepts/ConceptIndex';
    import {
        getConceptFromURL,
        setConceptInURL,
    } from '@concepts/ConceptParams';
    import type Conflict from '@conflicts/Conflict';
    import type Chat from '@db/chats/ChatDatabase.svelte';
    import type { Creator } from '@db/creators/CreatorDatabase';
    import {
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
    } from '@db/Database';
    import type Project from '@db/projects/Project';
    import Arrangement, {
        isResizeable,
        type ArrangementType,
    } from '@db/settings/Arrangement';
    import { consent, refreshConsentFromBrowser } from '@input/permissions';
    import type Locale from '@locale/Locale';
    import Evaluate from '@nodes/Evaluate';
    import Node, { isFieldPosition } from '@nodes/Node';
    import Source from '@nodes/Source';
    import type Color from '@output/Color';
    import {
        CANCEL_SYMBOL,
        EXCEPTION_SYMBOL,
        INFO_SYMBOL,
    } from '@parser/Symbols';
    import { isName } from '@parser/Tokenizer';
    import Evaluator from '@runtime/Evaluator';
    import type Value from '@values/Value';
    import { onDestroy, onMount, tick, untrack } from 'svelte';
    import { writable, type Writable } from 'svelte/store';
    import Characters from '../../lore/BasisCharacters';
    import {
        PROJECT_PARAM_EDIT,
        PROJECT_PARAM_PLAY,
    } from '../../routes/[[locale]]/project/constants';

    import Toolbar from '@components/editor/commands/Toolbar.svelte';
    import OverflowToolbar from '@components/widgets/OverflowToolbar.svelte';
    import Editor from '@components/editor/Editor.svelte';
    import type { HighlightSpec } from '@components/editor/highlights/Highlights';
    import getOutlineOf, {
        getUnderlineOf,
    } from '@components/editor/highlights/outline';
    import Timeline from '@components/evaluator/Timeline.svelte';
    import OutputView from '@components/output/OutputView.svelte';
    import type PaintingConfiguration from '@components/output/PaintingConfiguration';
    import Palette from '@components/palette/Palette.svelte';
    import type Bounds from '@components/project/Bounds';
    import {
        getConceptPath,
        getFullscreen,
        IdleKind,
        setAnimatingNodes,
        setConceptIndex,
        setConflicts,
        setDragged,
        setEditors,
        setEvaluation,
        setKeyboardEditIdle,
        setKeyboardModifiers,
        setProjectCommandContext,
        setResetKeyboardIdle,
        setSelectedOutput,
        type ConceptPath,
        type EditorState,
        type KeyModifierState,
    } from '@components/project/Contexts';
    import CopyButton from '@components/project/CopyButton.svelte';
    import Layout from '@components/project/Layout';
    import Moderation from '@components/project/Moderation.svelte';
    import OutputLocaleChooser from '@components/project/OutputLocaleChooser.svelte';
    import PositionAdjuster from '@components/project/PositionAdjuster.svelte';
    import ProjectFooter from '@components/project/ProjectFooter.svelte';
    import RootView from '@components/project/RootView.svelte';
    import SelectedOutput from '@components/project/SelectedOutput.svelte';
    import Tile, { TileMode } from '@components/project/Tile';
    import { TileKind } from '@components/project/TileKind';
    import TileView, {
        type ResizeDirection,
    } from '@components/project/TileView.svelte';
    import Button from '@components/widgets/Button.svelte';
    import CommandButton from '@components/widgets/CommandButton.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import Switch from '@components/widgets/Switch.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import type Gallery from '@db/galleries/Gallery';
    import GalleryHowTo from '@db/howtos/HowToDatabase.svelte';
    import {
        AnimationFactorIcons,
        AnimationFactors,
        AnimationFactorSetting,
        AnimationIcon,
    } from '@db/settings/AnimationFactorSetting';
    import type MenuInfo from '@edit/menu/Menu';
    import type { LocaleTextAccessor } from '@locale/Locales';
    import RemoteCarets from '@components/editor/RemoteCarets.svelte';

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
        guide = true,
        warn = true,
        shareable = true,
        dragged = $bindable(undefined),
        index = $bindable(undefined),
        persistLayout = true,
        isCommenter = false,
    }: Props = $props();

    /** The raw user-chosen animation factor (number or null for "auto"); used
     * by the animation-speed picker so it reflects the actual choice rather
     * than the effective resolved value. */
    const animationFactor = AnimationFactorSetting.value;

    // The HTMLElement that represents this element
    let view = $state<HTMLElement | undefined>(undefined);

    // The conflicts of interest in each editor, used to generate annotations.
    let conflictsOfInterest = $state<Map<Source, Conflict[]>>(new Map());

    /** Per-editor large deletion notifications */
    let largeDeletionNotifications = $state<
        Map<string, LocaleTextAccessor | null>
    >(new Map());

    /** Function to set large deletion notification for a specific editor */
    function setLargeDeletionNotification(sourceID: string) {
        return (message: LocaleTextAccessor | null) => {
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

    let keyboardIdleTimeout: NodeJS.Timeout | undefined = undefined;

    /** Reset the keyboard idle timeout. Called on every keystroke so the
     * 1s idle window correctly debounces, but does NOT touch the
     * keyboardEditIdle store — that would re-fire every subscriber on
     * every keystroke (the timer-arming effect, the conflicts gate, the
     * displayedCaret defer effect, etc.) most of which are idempotent
     * when the idle state hasn't actually changed. */
    function resetKeyboardIdle() {
        if (keyboardIdleTimeout) clearTimeout(keyboardIdleTimeout);
        keyboardIdleTimeout = setTimeout(
            () => keyboardEditIdle.set(IdleKind.Idle),
            KeyboardIdleWaitTime,
        );
    }
    setResetKeyboardIdle(resetKeyboardIdle);
    onDestroy(() => {
        if (keyboardIdleTimeout) clearTimeout(keyboardIdleTimeout);
    });

    // Live coediting (Yjs CRDT + Firestore update transport + presence
    // heartbeat) is view-driven: we activate it when the user opens
    // this project and tear it down when they leave. Activating in
    // ProjectsDatabase.track() instead would spin up a Y.Doc and two
    // Firestore listeners for *every* project the user has access to,
    // even ones they aren't looking at — wasted quota.
    //
    // Lifecycle hooks (onMount / onDestroy), not $effect: this isn't
    // reactive work and using $effect produces an infinite loop. The
    // cleanup deactivates the CRDT, which calls history.edit to
    // capture the final snapshot — that write fires reactive deps
    // that the parent route reads to re-derive the `project` prop,
    // which would re-fire any $effect that reads `project`. Pinning
    // the project ID at component init and running activate/deactivate
    // exactly once each sidesteps the loop entirely. ProjectView
    // remounts on SvelteKit route changes, so re-activation on URL
    // change happens naturally via the next mount.
    const crdtProjectID = project.getID();
    onMount(() => {
        Projects.activateCRDT(crdtProjectID);
    });
    onDestroy(() => {
        // deactivateCRDT is async (it awaits the final flush of
        // queued realtime updates before tearing down). The
        // in-memory snapshot capture happens *synchronously* inside
        // before any await, so a rapid re-mount after this unmount
        // would still see the latest snapshot on the in-memory
        // project — see the docs on deactivateCRDT.
        void Projects.deactivateCRDT(crdtProjectID);
    });

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
    /** The project we last built the evaluator from. Used to skip rebuilds
     *  for metadata-only changes (e.g., preview-glyph updates) — the
     *  Evaluator only cares about id + name + sources, which is exactly
     *  what `Project.equals()` compares. Without this, toggling
     *  manual→auto in the share dialog would rebuild the evaluator from
     *  scratch and the preview-write would race the fresh evaluation,
     *  leaving a visible delay (or worse, stamping EXCEPTION_SYMBOL). */
    let lastProjectForEvaluator: Project | undefined;
    projectStore.subscribe((newProject) => {
        if (
            lastProjectForEvaluator !== undefined &&
            lastProjectForEvaluator.equals(newProject)
        ) {
            lastProjectForEvaluator = newProject;
            return;
        }
        lastProjectForEvaluator = newProject;
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
            // Choose the selected evaluation locale or if not selected, the project's embedded locales
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
        // Cancel any pending debounced write — we're about to do it
        // synchronously below.
        if (pendingPreviewWrite !== undefined) {
            clearTimeout(pendingPreviewWrite);
            pendingPreviewWrite = undefined;
        }
        // If the user navigates away faster than the live evaluator
        // produced its first value (e.g., type-and-immediately-back-out
        // from ProjectView), getLatestSourceValue returns undefined and
        // the write below would bail. Force the evaluator to a stable
        // value with getInitialValue() — it resets and runs to completion
        // synchronously, which is fine because we're about to stop the
        // evaluator anyway.
        if (
            $evaluator !== undefined &&
            $evaluator.getLatestSourceValue(project.getMain()) === undefined
        ) {
            try {
                $evaluator.getInitialValue();
            } catch {
                // Best-effort: if the evaluator is in some torn-down
                // state, fall through to writePreviewFromEvaluator which
                // will bail on undefined.
            }
        }
        writePreviewFromEvaluator();
        $evaluator?.stop();
    });

    /**
     * Auto-update the persisted project preview (issue #435). The live
     * evaluator is already running, so we piggy-back on its current value
     * instead of constructing a separate evaluator like /projects and
     * /galleries used to do.
     *
     * Strategy:
     *  - If no auto preview exists yet (fresh project, or the user just
     *    toggled from manual back to auto), write immediately so the tile
     *    isn't blank.
     *  - Otherwise debounce: each `$evaluation` change cancels the pending
     *    write and schedules a new one ~3s out. After 3s of no further
     *    evaluator activity, the latest preview lands. This both avoids
     *    history noise during a typing burst and guarantees the preview
     *    eventually refreshes — the previous throttle could silently drop
     *    every write between two evaluator settles.
     */
    let pendingPreviewWrite: ReturnType<typeof setTimeout> | undefined;
    let lastWrittenText: string | undefined = undefined;
    // Just long enough to coalesce typing-burst evaluations into a single
    // write; short enough that a user editing and immediately switching
    // tabs sees the new glyph on /projects without "wait a moment" feel.
    // The onDestroy hook also forces a synchronous write on unmount, so
    // this value is only the in-session typing-burst coalesce window.
    const PREVIEW_DEBOUNCE_MS = 500;

    function writePreviewFromEvaluator() {
        if ($evaluator === undefined) return;
        if (project.getPreview()?.mode === 'manual') return;
        const value = $evaluator.getLatestSourceValue(project.getMain());
        // The evaluator may not have produced a value yet (fresh project,
        // just-recreated evaluator, etc.). Stamping `EXCEPTION_SYMBOL` over
        // a cached good preview is worse than waiting — bail out and let
        // the next $evaluation tick try again.
        if (value === undefined) return;
        const extracted = extractPreview($evaluator, value, $locales);
        if (extracted.text === EXCEPTION_SYMBOL) return;
        // Skip the write if the text hasn't changed since the last one —
        // saves a no-op history.edit + saveSoon.
        if (
            extracted.text === lastWrittenText &&
            project.getPreview()?.mode === 'auto'
        )
            return;
        lastWrittenText = extracted.text;
        Projects.setAutoPreview(project.getID(), extracted);
    }

    $effect(() => {
        // Track both evaluator activity AND the project's current preview,
        // so toggling manual→auto (which clears `preview` to undefined)
        // also triggers a refresh.
        $evaluation;
        const current = project.getPreview();

        // Manual override is the user's word — don't write.
        if (current?.mode === 'manual') return;

        // No auto preview yet → write immediately so the tile isn't blank.
        if (current === undefined) {
            if (pendingPreviewWrite !== undefined) {
                clearTimeout(pendingPreviewWrite);
                pendingPreviewWrite = undefined;
            }
            untrack(writePreviewFromEvaluator);
            return;
        }

        // Have an auto preview — debounce subsequent updates so a typing
        // burst doesn't push a history entry per keystroke.
        if (pendingPreviewWrite !== undefined)
            clearTimeout(pendingPreviewWrite);
        pendingPreviewWrite = setTimeout(() => {
            pendingPreviewWrite = undefined;
            untrack(writePreviewFromEvaluator);
        }, PREVIEW_DEBOUNCE_MS);

        return () => {
            if (pendingPreviewWrite !== undefined) {
                clearTimeout(pendingPreviewWrite);
                pendingPreviewWrite = undefined;
            }
        };
    });

    /** Several store contexts for tracking evaluator state. */
    const animatingNodes = writable<Set<Node>>(new Set());
    setAnimatingNodes(animatingNodes);

    /** A store for tracking editor state for all Sources */
    const editors = writable(new Map<string, EditorState>());
    setEditors(editors);

    /** The currently focused editor state */
    const focusedEditorState = $derived(
        Array.from($editors.values()).find((editor) => editor.focused),
    );

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

    /** Which tile-level tour is currently open, if any. */
    let openTour = $state<
        | undefined
        | 'stage'
        | 'source'
        | 'docs'
        | 'palette'
        | 'collaborate'
        | 'project'
    >(undefined);

    const stageTourSteps: UIExplanation[] = [
        { uiid: 'stage', explanation: (l) => l.ui.output.tour.stage },
        {
            uiid: 'resetEvaluator',
            explanation: (l) => l.ui.output.tour.reset,
        },
        { uiid: 'stageZoom', explanation: (l) => l.ui.output.tour.zoom },
        { uiid: 'stageGrid', explanation: (l) => l.ui.output.tour.grid },
        { uiid: 'stageLock', explanation: (l) => l.ui.output.tour.lock },
        {
            uiid: 'stageAnimationSpeed',
            explanation: (l) => l.ui.output.tour.animationSpeed,
        },
    ];

    const sourceTourSteps: UIExplanation[] = [
        { uiid: 'editor', explanation: (l) => l.ui.source.tour.editor },
        {
            uiid: 'textBlocksToggle',
            explanation: (l) => l.ui.source.tour.textBlocks,
        },
        {
            uiid: 'editorToolbar',
            explanation: (l) => l.ui.source.tour.toolbar,
        },
        {
            uiid: 'editorExpand',
            explanation: (l) => l.ui.source.tour.expand,
        },
        {
            uiid: 'shortcutsDialog',
            explanation: (l) => l.ui.source.tour.shortcuts,
        },
    ];

    const projectTourSteps: UIExplanation[] = [
        {
            uiid: 'projectControls',
            explanation: (l) => l.ui.project.tour.controls,
        },
        {
            uiid: 'projectName',
            explanation: (l) => l.ui.project.tour.name,
        },
        {
            uiid: 'sourceToggle',
            explanation: (l) => l.ui.project.tour.sourceToggle,
        },
        {
            uiid: 'addSource',
            explanation: (l) => l.ui.project.tour.addSource,
        },
        {
            uiid: 'shareDialog',
            explanation: (l) => l.ui.project.tour.share,
        },
        {
            uiid: 'translateButton',
            explanation: (l) => l.ui.project.tour.translate,
        },
        {
            uiid: 'checkpoints',
            explanation: (l) => l.ui.project.tour.checkpoints,
        },
    ];

    /** Programmatically click the docs mode toggle for the given index
     * (0 = code/language, 1 = how-to). Mode listens to `pointerdown`, so a
     * synthesized event is what actually triggers selection. */
    function setDocsMode(index: number) {
        const buttons = document.querySelectorAll<HTMLButtonElement>(
            '[data-uiid="docsModeToggle"] button',
        );
        const target = buttons[index];
        if (target && target.getAttribute('aria-checked') !== 'true')
            target.dispatchEvent(
                new PointerEvent('pointerdown', {
                    bubbles: true,
                    button: 0,
                    pointerType: 'mouse',
                }),
            );
    }

    const docsTourSteps: UIExplanation[] = [
        { uiid: 'documentation', explanation: (l) => l.ui.docs.tour.guide },
        {
            uiid: 'documentation',
            explanation: (l) => l.ui.docs.tour.code,
            onEnter: () => setDocsMode(0),
        },
        {
            uiid: 'documentation',
            explanation: (l) => l.ui.docs.tour.howto,
            onEnter: () => setDocsMode(1),
        },
        { uiid: 'docsModeToggle', explanation: (l) => l.ui.docs.tour.mode },
        { uiid: 'docsSearch', explanation: (l) => l.ui.docs.tour.search },
    ];

    const paletteTourSteps: UIExplanation[] = [
        { uiid: 'palette', explanation: (l) => l.ui.palette.tour.palette },
        { uiid: 'paletteText', explanation: (l) => l.ui.palette.tour.text },
        { uiid: 'paletteSet', explanation: (l) => l.ui.palette.tour.set },
        { uiid: 'paletteUnset', explanation: (l) => l.ui.palette.tour.unset },
        { uiid: 'editor', explanation: (l) => l.ui.palette.tour.editor },
        { uiid: 'stage', explanation: (l) => l.ui.palette.tour.stage },
    ];

    const collaborateTourSteps: UIExplanation[] = [
        {
            uiid: 'collaborate',
            explanation: (l) => l.ui.collaborate.tour.collaborate,
        },
        {
            uiid: 'collaborators',
            explanation: (l) => l.ui.collaborate.tour.collaborators,
        },
        {
            uiid: 'commenters',
            explanation: (l) => l.ui.collaborate.tour.commenters,
        },
        {
            uiid: 'viewers',
            explanation: (l) => l.ui.collaborate.tour.viewers,
        },
        {
            uiid: 'restrictGallery',
            explanation: (l) => l.ui.collaborate.tour.restrict,
        },
    ];

    /** Open the palette tour, first selecting any Phrase in the project so
     * the palette has properties to display. Falls back to highlighting the
     * empty palette if no Phrase exists. */
    function startPaletteTour() {
        for (const source of project.getSources()) {
            const phrases = source.root.root.nodes(
                (node): node is Evaluate =>
                    node instanceof Evaluate &&
                    node.is(
                        project.shares.output.Phrase,
                        project.getNodeContext(node),
                    ),
            );
            if (phrases.length > 0) {
                selectedOutput.setPaths(project, [phrases[0]], 'palette');
                break;
            }
        }
        openTour = 'palette';
    }

    /** Undefined or an object defining painting configuration */
    let painting = $state(false);
    let paintingConfig = $state<PaintingConfiguration>({
        characters: 'a',
        size: 1,
        font: $locales.getUnannotatedText((l) => l.ui.font.app),
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
    let latestHowTos: unknown = undefined;
    let latestGalleryHowTos: GalleryHowTo[] = [];

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
        // Read reactive inputs in the outer scope so the effect re-runs when
        // they change (howTos loading, gallery changes, project edit).
        const resolvedHowTos = howTos instanceof Promise ? [] : howTos;
        const currentGalleryHowTos = galleryHowTos;
        // Rebuild after the user finishes typing (Idle) or on a single
        // atomic edit (Typed) — but never mid-flurry, since walking the
        // source for StructureDefinition/FunctionDefinition/Bind concepts
        // is expensive and the result would be discarded on the next key.
        const notTyping = $keyboardEditIdle !== IdleKind.Typing;
        const currentProject = project;

        // Wrap the rebuild logic in untrack() so that reads and writes of
        // index and $path don't create a dependency cycle: without this,
        // writing index/path would re-trigger this effect.
        untrack(() => {
            if (
                index === undefined ||
                (notTyping && latestProject !== currentProject) ||
                resolvedHowTos !== latestHowTos ||
                currentGalleryHowTos !== latestGalleryHowTos
            ) {
                latestProject = currentProject;
                latestHowTos = resolvedHowTos;
                latestGalleryHowTos = currentGalleryHowTos;

                // Make a new concept index with the new project and translations, but the old examples.
                const newIndex = currentProject
                    ? ConceptIndex.make(
                          currentProject,
                          $locales,
                          resolvedHowTos ?? [],
                          HowTos.allAccessiblePublishedHowTos,
                      ).withExamples(
                          index === undefined ? new Map() : index.examples,
                      )
                    : undefined;

                // Set the index
                index = newIndex;

                // Map the old path to the new one using concept equality.
                if (path)
                    path.set(
                        newIndex && $path
                            ? $path
                                  .map((concept) =>
                                      newIndex?.getEquivalent(concept),
                                  )
                                  .filter((c): c is Concept => c !== undefined)
                            : [],
                    );

                // Ensure the selected source index is in bounds.
                selectedSourceIndex = Math.min(
                    selectedSourceIndex,
                    currentProject.getSupplements().length,
                );
            }
        });
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

    /** Permissions the current project needs but for which the user hasn't yet made a decision. */
    const requiredPermissions = $derived(project.getRequiredPermissions());
    const pendingPermissions = $derived(
        new Set(
            [...requiredPermissions].filter((p) => $consent[p] === 'unknown'),
        ),
    );

    /** When the project's required permissions change, see if the browser already granted them. */
    $effect(() => {
        for (const permission of requiredPermissions) {
            untrack(() => refreshConsentFromBrowser(permission));
        }
    });

    /**
     * Any time the evaluator of the project changes, start it — unless a
     * required browser permission has not yet been granted.
     * */
    let updateTimer = $state<NodeJS.Timeout | undefined>(undefined);
    $effect(() => {
        if (pendingPermissions.size > 0) return;
        if (!$evaluator.isStarted()) $evaluator.start();
    });

    function updateConflicts() {
        // During a typing flurry skip the analysis entirely. project.analyze()
        // walks every source node, computes types and conflicts, and is
        // 50-200ms on a 100+ line program. Running it on every keystroke (and
        // throwing the result away on the next stroke) is the dominant cost
        // of typing in large files. The effect below re-fires when
        // $keyboardEditIdle leaves Typing, at which point we'll catch up.
        if ($keyboardEditIdle === IdleKind.Typing) return;

        // Analyzed? Update the conflicts immediately.
        if (project.analyzed === 'analyzed') {
            conflicts.set(project.getConflicts());
        }
        // Not yet analyzed? Run analysis now and publish.
        else if (project.analyzed === 'unanalyzed') {
            project.analyze();
            conflicts.set(project.getConflicts());
        }
        // Still analyzing (re-entrant case)? Try again shortly.
        else {
            if (updateTimer) clearTimeout(updateTimer);
            updateTimer = setTimeout(updateConflicts, KeyboardIdleWaitTime);
        }
    }

    /** Any time the project changes or typing settles, update the conflicts. */
    $effect(() => {
        // Track both: project change re-fires (post-edit) and idle transitions
        // re-fire (typing → typed/idle) so analysis happens as soon as the user
        // pauses.
        project;
        $keyboardEditIdle;
        updateConflicts();
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

    /** Clear output selection when evaluation resumes, so stale handles don't linger. */
    $effect(() => {
        if ($evaluation.playing === true) {
            selectedOutput.empty();
            // Close the palette when playing resumes, since content can't be edited while playing.
            const palette = untrack(() => layout).getPalette();
            if (palette && palette.mode === TileMode.Expanded)
                untrack(() => setMode(palette, TileMode.Collapsed));
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

    let outputView = $state<OutputView | undefined>(undefined);

    /** Tracks whether the current stage value has an explicit place set, so the toolbar can show a reset-zoom button. */
    let hasStagePlace = $state(false);

    /** Tracks whether the audience has overridden the stage's computed focus, so the reset-zoom button can be disabled when there is nothing to reset. */
    let focusOverridden = $state(false);

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
                : (focusedEditorState?.caret ??
                  Array.from($editors.values())[0]?.caret),
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
        zoom: focusedEditorState?.zoom,
        setZoom: focusedEditorState?.setZoom,
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
        // Re-fetch whenever the project changes; do NOT subscribe to the
        // chats $state map. Doing so would register this effect's closure
        // as a reaction on Chats.chats — and that closure transitively
        // captures the whole ProjectView script scope (including the
        // commandContext $derived, which exposes the live evaluator and
        // its temporalStreams). On any kind of remount the stale reaction
        // would pin an old Evaluator (and therefore the old Hand stream,
        // its camera DOM, and its MediaPipe WebAssembly.Memory) until the
        // ChatDatabase singleton itself goes away — which never happens
        // during a page session.
        const currentProject = project;
        const projectID = currentProject.getID();
        untrack(() => {
            Chats.getChat(currentProject).then((retrievedChat) => {
                chat = retrievedChat;
            });
        });

        // Keep chat in sync with future Firebase updates for this project via
        // an explicit push subscription that bypasses the reactive graph.
        if (projectID)
            return Chats.onChatUpdated(projectID, (updated) => {
                chat = updated;
            });
    });

    let currentArrangement = $state<ArrangementType>($arrangement);

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
            // Pause the evaluator when the palette opens, so content can be edited.
            if (mode === TileMode.Expanded && $evaluator.isPlaying())
                $evaluator.pause();
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
            // The descendant combinator would also match triggers inside
            // nested .node-view children (which can reuse the same field
            // name, e.g. inner and outer Evaluate.inputs), so filter to the
            // trigger whose closest .node-view ancestor is the actual parent.
            const candidates = editor.querySelectorAll(
                `.node-view[data-id="${anchor.parent.id}"] .trigger[data-field="${anchor.field}"]`,
            );
            const trigger = Array.from(candidates).find(
                (t) =>
                    t.closest('.node-view')?.getAttribute('data-id') ===
                    String(anchor.parent.id),
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
            `${$locales.getUnannotatedText((l) => l.term.source)}${
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
            requestedPlay = false;
            setMode(main, TileMode.Expanded);
            layout = layout.withoutFullscreen();
        }
    }

    function revert() {
        if (original) Projects.reviseProject(original);
    }
</script>

<svelte:head
    ><title>Wordplay - {getLocalizedProjectName(project, $locales)}</title
    ></svelte:head
>

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
                            {#snippet title()}{/snippet}

                            {#snippet help()}
                                {#if tile.kind === TileKind.Output}
                                    <Button
                                        tip={(l) => l.ui.output.tour.launch}
                                        background="circular"
                                        padding={false}
                                        icon={INFO_SYMBOL}
                                        uiid="stageTourLaunch"
                                        action={() => {
                                            openTour = 'stage';
                                        }}
                                    ></Button>
                                {:else if tile.kind === TileKind.Source}
                                    <Button
                                        tip={(l) => l.ui.source.tour.launch}
                                        background="circular"
                                        padding={false}
                                        icon={INFO_SYMBOL}
                                        uiid="sourceTourLaunch"
                                        action={() => {
                                            openTour = 'source';
                                        }}
                                    ></Button>
                                {:else if tile.kind === TileKind.Documentation}
                                    <Button
                                        tip={(l) => l.ui.docs.tour.launch}
                                        background="circular"
                                        padding={false}
                                        icon={INFO_SYMBOL}
                                        uiid="docsTourLaunch"
                                        action={() => {
                                            openTour = 'docs';
                                        }}
                                    ></Button>
                                {:else if tile.kind === TileKind.Palette}
                                    <Button
                                        tip={(l) => l.ui.palette.tour.launch}
                                        background="circular"
                                        padding={false}
                                        icon={INFO_SYMBOL}
                                        uiid="paletteTourLaunch"
                                        action={startPaletteTour}
                                    ></Button>
                                {:else if tile.kind === TileKind.Collaborate}
                                    <Button
                                        tip={(l) =>
                                            l.ui.collaborate.tour.launch}
                                        background="circular"
                                        padding={false}
                                        icon={INFO_SYMBOL}
                                        uiid="collaborateTourLaunch"
                                        action={() => {
                                            openTour = 'collaborate';
                                        }}
                                    ></Button>
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
                                    {#snippet outputPlayPause()}
                                        {#if requestedPlay || showOutput}
                                            <Switch
                                                on={$evaluation?.playing ===
                                                    true}
                                                toggle={(play) =>
                                                    play
                                                        ? $evaluator.play()
                                                        : $evaluator.pause()}
                                                offTip={Pause.description}
                                                onTip={Play.description}
                                                offLabel={Pause.symbol}
                                                onLabel={Play.symbol}
                                                uiid="playToggle"
                                                shortcut={toShortcut(Play)}
                                            />
                                        {/if}
                                    {/snippet}
                                    {#snippet outputRestart()}
                                        <CommandButton
                                            background
                                            padding
                                            command={Restart}
                                        />
                                    {/snippet}
                                    {#snippet outputCopy()}
                                        {#if !editable}<CopyButton
                                                {project}
                                            ></CopyButton>{/if}
                                    {/snippet}
                                    {#snippet outputEdit()}
                                        {#if (requestedPlay || showOutput) && layout.isFullscreen()}
                                            <Button
                                                uiid="editProject"
                                                background
                                                tip={(l) =>
                                                    l.ui.page.projects.button
                                                        .viewcode}
                                                action={() => stopPlaying()}
                                                icon="👁️"
                                            ></Button>
                                        {/if}
                                    {/snippet}
                                    {#snippet outputLocale()}
                                        {#if localesUsed.length > 0}
                                            <OutputLocaleChooser
                                                {localesUsed}
                                                locale={evaluationLocale}
                                                change={(locale) => {
                                                    evaluationLocale = locale;
                                                    updateEvaluator(project);
                                                }}
                                            />
                                        {/if}
                                    {/snippet}
                                    {#snippet outputZoom()}
                                        <span
                                            class="zoom-group"
                                            data-uiid="stageZoom"
                                        >
                                            <Button
                                                background
                                                action={() =>
                                                    outputView?.adjustZoom(-1)}
                                                tip={(l) =>
                                                    l.ui.output.button.zoomOut}
                                                ><Emoji>–🔎</Emoji></Button
                                            >
                                            <Button
                                                background
                                                action={() =>
                                                    outputView?.adjustZoom(1)}
                                                tip={(l) =>
                                                    l.ui.output.button.zoomIn}
                                                ><Emoji>+🔎</Emoji></Button
                                            >
                                            {#if hasStagePlace}
                                                <Button
                                                    action={() =>
                                                        outputView?.resetZoom()}
                                                    tip={(l) =>
                                                        l.ui.output.button
                                                            .resetZoom}
                                                    background
                                                    active={focusOverridden}
                                                    ><Emoji>⟲🔎</Emoji></Button
                                                >
                                            {/if}
                                        </span>
                                    {/snippet}
                                    {#snippet outputGridFit()}
                                        <span class="grid-fit">
                                            <Toggle
                                                uiid="stageGrid"
                                                tips={(l) =>
                                                    l.ui.output.toggle.grid}
                                                on={grid}
                                                toggle={() => (grid = !grid)}
                                                ><Emoji>▦</Emoji></Toggle
                                            ><Toggle
                                                uiid="stageLock"
                                                tips={(l) =>
                                                    l.ui.output.toggle.fit}
                                                on={fit}
                                                toggle={() => (fit = !fit)}
                                                ><Emoji
                                                    >{#if fit}🔒{:else}🔓{/if}</Emoji
                                                ></Toggle
                                            >
                                        </span>
                                    {/snippet}
                                    {#snippet outputAnimation()}
                                        <label
                                            class="output-locale"
                                            data-uiid="stageAnimationSpeed"
                                            >{AnimationIcon}
                                            <Options
                                                value={$animationFactor === null
                                                    ? 'auto'
                                                    : String($animationFactor)}
                                                label={(l) =>
                                                    l.ui.dialog.settings.mode
                                                        .animate.label}
                                                options={AnimationFactors.map(
                                                    (factor, i) => ({
                                                        value:
                                                            factor === null
                                                                ? 'auto'
                                                                : String(
                                                                      factor,
                                                                  ),
                                                        label: AnimationFactorIcons[
                                                            i
                                                        ],
                                                    }),
                                                )}
                                                change={(v) =>
                                                    Settings.setAnimationFactor(
                                                        v === undefined ||
                                                            v === 'auto'
                                                            ? null
                                                            : Number(v),
                                                    )}
                                            />
                                        </label>
                                    {/snippet}
                                    <OverflowToolbar
                                        items={[
                                            outputPlayPause,
                                            outputRestart,
                                            outputCopy,
                                            outputEdit,
                                            outputLocale,
                                            outputZoom,
                                            outputGridFit,
                                            outputAnimation,
                                        ]}
                                    />
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
                                        bind:this={outputView}
                                        {project}
                                        evaluator={$evaluator}
                                        value={latestValue}
                                        bind:fit
                                        bind:grid
                                        bind:painting
                                        bind:hasStagePlace
                                        bind:focusOverridden
                                        {paintingConfig}
                                        bind:background={outputBackground}
                                        editable={editableAndCurrent}
                                        onretry={() => updateEvaluator(project)}
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
                                {@const notification =
                                    largeDeletionNotifications.get(tile.id)}
                                {#if tile.kind === TileKind.Source && editable}
                                    <!-- Collaborator chip row sits above
                                         the glyph-insertion area, in the
                                         same band the large-deletion
                                         overlay uses. Renders nothing
                                         when the local user is the only
                                         editor. -->
                                    <RemoteCarets projectID={project.getID()} />

                                    {#if editableAndCurrent}<GlyphInserter
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

                                    {#if notification}
                                        <div
                                            class="large-deletion-notification"
                                        >
                                            <LocalizedText
                                                path={notification}
                                            />
                                        </div>
                                    {/if}
                                {:else if tile.kind === TileKind.Output && !requestedPlay && !showOutput}
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
                                            caret={$editors.get(tile.id)
                                                ?.displayedCaret}
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
        <ProjectFooter
            {project}
            {layout}
            {editable}
            {shareable}
            {creator}
            {chat}
            {isCommenter}
            {original}
            arrangement={$arrangement}
            {canvasWidth}
            {canvasHeight}
            {sources}
            {editorLocales}
            {browserFullscreen}
            {setBrowserFullscreen}
            {revert}
            {addSource}
            {toggleTile}
            launchTour={() => {
                openTour = 'project';
            }}
            bind:checkpoint
        />

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

{#if openTour === 'stage'}
    <Tour
        explanations={stageTourSteps}
        subheader={(l) => l.ui.tile.label.output}
        close={() => (openTour = undefined)}
    />
{:else if openTour === 'source'}
    <Tour
        explanations={sourceTourSteps}
        subheader={(l) => l.ui.tile.label.source}
        close={() => (openTour = undefined)}
    />
{:else if openTour === 'docs'}
    <Tour
        explanations={docsTourSteps}
        subheader={(l) => l.ui.tile.label.docs}
        close={() => (openTour = undefined)}
    />
{:else if openTour === 'palette'}
    <Tour
        explanations={paletteTourSteps}
        subheader={(l) => l.ui.tile.label.palette}
        close={() => (openTour = undefined)}
    />
{:else if openTour === 'collaborate'}
    <Tour
        explanations={collaborateTourSteps}
        subheader={(l) => l.ui.tile.label.collaborate}
        close={() => (openTour = undefined)}
    />
{:else if openTour === 'project'}
    <Tour
        explanations={projectTourSteps}
        subheader={(l) => l.ui.project.label}
        close={() => (openTour = undefined)}
    />
{/if}

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

    /* Group the two zoom buttons so the Tour can highlight them together. */
    .zoom-group {
        display: inline-flex;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .grid-fit {
        display: inline-flex;
        align-items: center;
        gap: var(--wordplay-spacing);
    }
</style>
