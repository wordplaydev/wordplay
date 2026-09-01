<script module lang="ts">
    import getConceptName from '@locale/getConceptName';
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
    import Documentation, {
        Modes,
    } from '@components/concepts/Documentation.svelte';
    import { resolveFeedback } from '@components/editor/commands/feedback';
    import {
        type Command,
        handleKeyCommand,
        Perform,
        Restart,
        StepBack,
        StepBackInput,
        StepBackNode,
        StepForward,
        StepForwardInput,
        StepForwardNode,
        StepOut,
        StepToPresent,
        StepToStart,
        VisibleModifyCommands,
        VisibleNavigateCommands,
        type CommandContext,
    } from '@components/editor/commands/Commands';
    import GlyphInserter from '@components/editor/commands/GlyphInserter.svelte';
    import Highlight from '@components/editor/highlights/Highlight.svelte';
    import Menu from '@components/editor/menu/Menu.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import {
        ProjectModeIcons,
        ProjectModes,
        ProjectModeViewIcons,
        type ProjectMode,
    } from '@components/project/ProjectMode';
    import { CatchUp } from '@components/project/catchUp';
    import PerformIcon from '@components/project/PerformIcon.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import Wellspring from '@components/wellspring/Wellspring.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Options from '@components/widgets/Options.svelte';
    import Tour from '@components/widgets/Tour.svelte';
    import { Tours, type TourID } from '@components/project/tours';
    import { TourSteps } from '@components/project/tourSteps';
    import ConceptIndex from '@concepts/ConceptIndex';
    import {
        getConceptFromURL,
        getEnumFromURL,
        getQueryFromURL,
        PARAM_HOWTO,
        PARAM_PURPOSE,
        PARAM_SECTION,
        setConceptInURL,
        setEnumInURL,
        setQueryInURL,
    } from '@concepts/ConceptParams';
    import { Purpose } from '@concepts/Purpose';
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
        musicVisualization,
        Settings,
        stagePlacement,
    } from '@db/Database';
    import { Projects } from '@db/projects/Projects';
    import {
        MusicVisualizationIcons,
        MusicVisualizations,
        toMusicVisualization,
    } from '@db/settings/MusicSettings';
    import { getLocalizedProjectName } from '@db/projects/getLocalizedProjectName';
    import type Project from '@db/projects/Project';
    import Arrangement, {
        isResizeable,
        type ArrangementType,
    } from '@db/settings/Arrangement';
    import { consent, refreshConsentFromBrowser } from '@input/permissions';
    import type Locale from '@locale/Locale';
    import { withoutAnnotations } from '@locale/withoutAnnotations';
    import Evaluate from '@nodes/Evaluate';
    import Node, { isFieldPosition } from '@nodes/Node';
    import {
        linesOfNode,
        referenceLabel,
        resolveReference,
        type ResolvedReference,
    } from '@db/chats/codeReference';
    import Source from '@nodes/Source';
    import {
        getCheckpoint,
        type CheckpointAnchor,
    } from '@components/project/checkpoints';
    import Color from '@output/Color/Color';
    import {
        CANCEL_SYMBOL,
        EXCEPTION_SYMBOL,
        INFO_SYMBOL,
    } from '@parser/Symbols';
    import { isName } from '@parser/Tokenizer';
    import Evaluator from '@runtime/Evaluator';
    import { debounced } from '@util/debounce.svelte';
    import ExceptionValue from '@values/ExceptionValue';
    import type Value from '@values/Value';
    import { onDestroy, onMount, tick, untrack } from 'svelte';
    import Drawing from '@components/output/Drawing.svelte.ts';
    import type { OutputInfoSet } from '@output/animation/Animator';
    import { writable, type Readable, type Writable } from 'svelte/store';
    import Characters from '../../lore/BasisCharacters';
    import {
        PROJECT_PARAM_EDIT,
        PROJECT_PARAM_MODE,
        PROJECT_PARAM_PLAY,
    } from '../../routes/[[locale]]/project/constants';

    import {
        currentConcept,
        remapConcepts,
        sameHistory,
        type GuidePlace,
    } from '@components/concepts/GuideHistory';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import ClipboardNotice from '@components/editor/ClipboardNotice.svelte';
    import {
        clearInternalClipboard,
        ClipboardContents,
    } from '@components/editor/commands/InternalClipboard';
    import Toolbar from '@components/editor/commands/Toolbar.svelte';
    import Editor from '@components/editor/Editor.svelte';
    import EditorNotice from '@components/editor/EditorNotice.svelte';
    import type {
        EditorNotification,
        EditorNotifier,
    } from '@components/editor/EditorNotification';
    import type { HighlightSpec } from '@components/editor/highlights/Highlights';
    import getOutlineOf, {
        getUnderlineOf,
    } from '@components/editor/highlights/outline';
    import RemoteCarets from '@components/editor/RemoteCarets.svelte';
    import Timeline from '@components/evaluator/Timeline.svelte';
    import type { GateBlock, GateWarning } from '@components/output/gate';
    import {
        ContentGate,
        getMusicWarnings,
        getPhotosensitivityWarnings,
    } from '@components/output/gate.svelte';
    import { zoomGauge, zoomPercent } from '@components/output/fit';
    import { withMonoEmoji } from '@unicode/emoji';
    import OutputView from '@components/output/OutputView.svelte';
    import Palette from '@components/palette/Palette.svelte';
    import type Bounds from '@components/project/Bounds';
    import {
        getAnnouncer,
        getConceptPath,
        getFullscreen,
        getUser,
        IdleKind,
        isAuthenticated,
        setAnimatingNodes,
        setSoundingNodes,
        setConceptIndex,
        setConflicts,
        setDragged,
        setEditors,
        setEmphasizedConflict,
        setEvaluation,
        setKeyboardEditIdle,
        setKeyboardModifiers,
        setPaletteOpen,
        setProjectCommandContext,
        setResetKeyboardIdle,
        setLinkedNode,
        setMessageRequest,
        setReferencedMessages,
        setResolvedReferences,
        type MessageRequest,
        setRevealPalette,
        getTourRequest,
        setTourRequest,
        type TourRequest,
        setSelectedOutput,
        setDrawing,
        setStageScene,
        type ConceptPath,
        type EditorState,
        type EmphasizedConflict,
        type KeyModifierState,
    } from '@components/project/Contexts';
    import Link from '@components/app/Link.svelte';
    import EvaluationCues from '@components/project/EvaluationCues.svelte';
    import RemixButton from '@components/project/RemixButton.svelte';
    import { PARAM_CONCEPT } from '@concepts/ConceptParams';
    import { PROJECT_PARAM_FROM } from '../../routes/[[locale]]/project/constants';
    import ReportButton from '@components/project/ReportButton.svelte';
    import Layout from '@components/project/Layout';
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
    import Mode from '@components/widgets/Mode.svelte';
    import OverflowToolbar from '@components/widgets/OverflowToolbar.svelte';
    import Toggle from '@components/widgets/Toggle.svelte';
    import type Gallery from '@db/galleries/Gallery';
    import GalleryHowTo from '@db/howtos/HowToDatabase.svelte';
    import {
        getBlockFlags,
        getUnmoderatedFlags,
        getWarnFlags,
    } from '@db/projects/Moderation';
    import { isAudience } from '@db/projects/ModerationUtils';
    import {
        AnimationFactorIcons,
        AnimationFactors,
        AnimationFactorSetting,
        AnimationIcon,
    } from '@db/settings/AnimationFactorSetting';
    import type MenuInfo from '@edit/menu/Menu';

    interface Props {
        project: Project;
        /** An optional original project to revert to */
        original?: Project | undefined;
        /** If false, then all things editable are deactivated */
        editable?: boolean;
        /** If true, only the output is shown in the initial layout. */
        showOutput?: boolean;
        /** Force the editor's annotation panel expanded (true) or collapsed (false); undefined uses
         * the creator's global annotation setting. Used by the tutorial to show or hide conflicts. */
        annotationsExpanded?: boolean | undefined;
        /** Whether the platform keeps reframing the stage to its content. The toolbar
         * toggles this, so it is bindable. */
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
        /** Whether to reflect the evaluation mode in the URL. Only the project route
         * should, so embedded views (tutorial, moderation) don't rewrite their URLs. */
        persistMode?: boolean;
        /** If false and not collaborator, then collaborate panel is not shown */
        isCommenter?: boolean;
    }

    let {
        project,
        original = undefined,
        editable = true,
        showOutput = false,
        annotationsExpanded = undefined,
        fit = $bindable(true),
        autofocus = true,
        guide = true,
        warn = true,
        shareable = true,
        dragged = $bindable(undefined),
        index = $bindable(undefined),
        persistLayout = true,
        persistMode = false,
        isCommenter = false,
    }: Props = $props();

    /** When the parent supplies an initial annotations-expanded state (e.g. the tutorial expands the
     * panel for a step with expected conflicts), seed a local, user-toggleable state from it — so it
     * sets the *initial* state rather than forcing the panel open or closed permanently. Left
     * undefined when the parent doesn't supply one, so Annotations falls back to the global setting.
     * Re-seeds whenever the parent recreates this view (e.g. the tutorial keys on the project). */
    let localAnnotationsExpanded = $state(annotationsExpanded);

    /** The raw user-chosen animation factor (number or null for "auto"); used
     * by the animation-speed picker so it reflects the actual choice rather
     * than the effective resolved value. */
    const animationFactor = AnimationFactorSetting.value;

    // The HTMLElement that represents this element
    let view = $state<HTMLElement | undefined>(undefined);

    // The conflicts of interest in each editor, used to generate annotations.
    let conflictsOfInterest = $state<Map<Source, Conflict[]>>(new Map());

    /** Per-editor footer notifications (large deletions, drag feedback, etc.), stacked when multiple are active. */
    let editorNotifications = $state<Map<string, EditorNotification[]>>(
        new Map(),
    );

    /** A controller a given editor uses to add and remove its footer notifications. */
    function getEditorNotifier(sourceID: string): EditorNotifier {
        const update = (
            fn: (list: EditorNotification[]) => EditorNotification[],
        ) => {
            editorNotifications.set(
                sourceID,
                fn(editorNotifications.get(sourceID) ?? []),
            );
            editorNotifications = new Map(editorNotifications);
        };
        return {
            set: (notification) =>
                update((list) => [
                    ...list.filter((n) => n.id !== notification.id),
                    notification,
                ]),
            clear: (id) => update((list) => list.filter((n) => n.id !== id)),
            clearAll: () => update(() => []),
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

    /** The checkpoint chosen in the checkpoint chooser, as its time, or null
     * for now. See checkpoints.ts for why it's a time and not an index. */
    let checkpoint = $state<CheckpointAnchor>(null);

    /** The chosen checkpoint, or undefined for now — and for an anchor whose
     * checkpoint has since been deleted, shifted off by the size limit, or
     * dropped by a remote merge. */
    let checkpointed = $derived(
        getCheckpoint(project.getCheckpoints(), checkpoint),
    );

    /** Having lost the checkpoint being viewed, return to now, so the chooser
     * and the restore banner agree with the sources actually being shown. */
    $effect(() => {
        if (checkpoint !== null && checkpointed === undefined)
            checkpoint = null;
    });

    /** Whether the project is editable and viewing an older checkpoint */
    let editableAndCurrent = $derived(editable && checkpoint === null);

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
        checkpointed
            ? checkpointed.sources.map((s) => new Source(s.names, s.code))
            : project.getSources(),
    );

    /** The selected source is based on the index.*/
    const selectedSource = $derived(sources[selectedSourceIndex]);

    /** Determine the initial evaluation mode from the URL: the `mode` param, then the
     * legacy `play`/`edit` params, then play for output-only embeds, then edit. */
    function parseModeParam(params: URLSearchParams): ProjectMode {
        const requested = params.get(PROJECT_PARAM_MODE);
        const known = ProjectModes.find((mode) => mode === requested);
        if (known !== undefined) return known;
        // Links from before the step mode was renamed.
        if (requested === 'step') return 'debug';
        if (params.get(PROJECT_PARAM_PLAY) !== null) return 'play';
        if (params.get(PROJECT_PARAM_EDIT) !== null) return 'edit';
        return showOutput ? 'play' : 'edit';
    }

    const initialMode = parseModeParam(page.url.searchParams);

    /** The current evaluation mode: edit (paused, everything editable), debug
     * (same pause, read-only, with evaluation state shown), or play (live,
     * interactive, read-only). Change it only through setUIMode, which keeps
     * the evaluator in sync. */
    let uiMode = $state<ProjectMode>(initialMode);

    /** Whether the page was entered in play mode, in which case the initial
     * layout fullscreens the output tile so the performance is the whole show.
     * Load-time only: switching modes in-session never touches the layout. */
    const initialPlayLayout = initialMode === 'play';

    /** One-shot request from the legacy edit param to open in an editing layout. */
    let requestedEdit = $state(
        page.url.searchParams.get(PROJECT_PARAM_EDIT) !== null,
    );

    /** The three slots the conversation and the editors use to talk about code
     *  (#820); see Contexts for why each is a slot. */
    const linkedNode = writable<Node | undefined>(undefined);
    setLinkedNode(linkedNode);
    const referencedMessages = writable(new Map<Node, string[]>());
    setReferencedMessages(referencedMessages);
    const resolvedReferences = writable(new Map<string, ResolvedReference>());
    setResolvedReferences(resolvedReferences);
    const messageRequest = writable<MessageRequest | undefined>(undefined);
    setMessageRequest(messageRequest);

    /** Whether program edits are permitted right now: an editable project, on the
     * current checkpoint, in edit mode. Debug and play modes are read-only. */
    let editableNow = $derived(editableAndCurrent && uiMode === 'edit');

    /** The fullscreen context of the page that this is in. */
    const pageFullscreen = getFullscreen();

    /** Tell the parent Page whether we're in fullscreen so it can hide and color things appropriately. */
    $effect(() => {
        // Only set a background if it's the stage that's in fullscreen.
        const background = layout.isStageFullscreen() ? outputBackground : null;
        pageFullscreen?.set({
            // Don't turn on fullscreen if we were requested to show output.
            on: layout.isFullscreen() && !showOutput,
            // Resolved here rather than in Page, which every route renders.
            background:
                background instanceof Color ? background.toCSS() : background,
            foreground:
                background instanceof Color
                    ? background.contrasting().toCSS()
                    : null,
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

    /** The channel StageView publishes the stage's layout on (#117). Created
     *  here rather than in OutputView because the palette reads it too, to
     *  place new output clear of what's already there, and the two are sibling
     *  tiles — this is their nearest common ancestor. */
    const stageScene = writable<(() => OutputInfoSet) | undefined>(undefined);
    setStageScene(stageScene);

    // The stage's drawing mode (#167), owned here because the toggle, the gesture, and the
    // preview are in three different tiles.
    const drawing = new Drawing();
    setDrawing(drawing);

    /** The centralized announcer, for narrating mode changes to screen readers. */
    const announce = getAnnouncer();

    /** The failing expression of the last exception we witnessed, so the
     * exception auto-switch fires once per distinct failure. Keyed by the
     * creator NODE rather than the exception value: every re-evaluation (a
     * scrub, a resume, a catch-up) mints a fresh ExceptionValue for the same
     * failure, and identity comparison would treat each as news. Not reactive;
     * it's bookkeeping for the evaluator observer. Declared before the project
     * subscription below, which resets it on evaluator replacement. */
    let lastSeenException: Node | undefined = undefined;

    /**
     * Invalidates these inputs, indicating that it shouldn't be used.
     * This is a bit of a hack: we primarily use it as a way for the UI to communicate
     * to itself that when creating a new Evaluator, it shouldn't mirror the prior Evaluator's inputs.
     */
    let replayInputs = $state(true);

    /**
     * Which run of the program the stage is showing. A performance begins when
     * the evaluator is rebuilt from the top — the reset button, the perform
     * button, a locale or checkpoint change — and continues across pause,
     * resume, mode switches, and debugger navigation. Anything that should
     * happen once per run (speaking a Say, sounding a one-shot score, playing
     * an entrance animation) compares this number via EvaluationContext rather
     * than keeping its own memory, which is how those three drifted apart
     * before it existed.
     */
    let performance = $state(0);

    /** Whether the next auto-started evaluator should rewind to step 0: a reset
     *  taken from the debugger means "show me the beginning". Plain rather than
     *  reactive — it's a one-shot message to the auto-start effect. */
    let landAtStart = false;

    function resetInputs() {
        replayInputs = false;
        landAtStart = uiMode === 'debug';
        // A reset abandons any catch-up underway: what plays next is fresh.
        catchUp.cancel();
        // Rebuilding from the top begins a performance, from any mode: what
        // plays next was begun rather than resumed.
        performance += 1;
        updateEvaluator(project);
    }

    /**
     * Create a state to store the current evaluator.
     */
    const evaluator: Writable<Evaluator> = writable();

    /**
     * Fast-forwards through recorded history when play is pressed from a past
     * position — the stage visibly replays how the present came to be, then
     * goes live at the edge of history. Without it, play snaps to the present
     * invisibly (Evaluator.play()), which reads as the stage teleporting.
     * The closures read $evaluator at call time on purpose: if a collaborator
     * edit replaces the evaluator mid-replay, the next frame simply finds the
     * mirrored evaluator already at the present and goes live.
     */
    const catchUp = new CatchUp({
        advance: () => {
            $evaluator.stepToInput();
            return $evaluator.isInPast();
        },
        live: () => $evaluator.play(),
    });

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

    /** Whether the evaluation context store exists yet: the first
     * updateEvaluator call runs during init (via the subscription below),
     * before the store is created. */
    let evaluationReady = false;

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
        // Only replace sources the checkpoint actually has: a checkpoint taken
        // when the project had fewer sources would otherwise pair one with
        // undefined.
        return proj.withSources(
            proj
                .getSources()
                .map((s, index): [Source, Source | undefined] => [
                    s,
                    sources[index],
                ])
                .filter(
                    (pair): pair is [Source, Source] => pair[1] !== undefined,
                ),
        );
    }

    function updateEvaluator(newProject: Project) {
        // The prior is stopped *after* the replacement mirrors it, not before: stop() clears
        // the raw input log, so stopping first left mirror() nothing to replay and every edit
        // restarted the program from the top (and made mirror's carried-supplement
        // optimization dead, since it reads the cleared source values). mirror() is
        // synchronous and only reads, so no stream tick can interleave; the cost is that both
        // evaluators' histories are live for that one call.
        const prior = $evaluator;

        // Make the new evaluator, replaying the previous evaluator's inputs, unless we marked the last evaluator is out of date.
        const newEvaluator = new Evaluator(
            // Is the checkpoint not now? Use the old sources instead of the current ones.
            checkpointed ? getCheckpointProject(newProject) : newProject,
            DB,
            // Choose the selected evaluation locale or if not selected, the project's embedded locales
            evaluationLocale ? [evaluationLocale] : localesUsed,
            true,
            replayInputs ? prior : undefined,
        );

        // Now that the replacement has taken what it needs, release the prior.
        prior?.stop();

        // Switch back to replay after the next input.
        replayInputs = true;

        // Re-impose the current UI mode on the replacement evaluator, covering resets
        // where there is no prior evaluator to mirror.
        newEvaluator.setIgnoringInputs(uiMode !== 'play');
        lastSeenException = undefined;

        // Listen to the evaluator changes to update evaluator-related stores.
        newEvaluator.observe(updateEvaluatorStores);

        // Set the evaluator store
        evaluator.set(newEvaluator);

        // Mark the evaluator not stale.
        staleEvaluator = false;

        // Sync the evaluation context to the replacement now. A mirrored
        // evaluator arrives already started — its constructor replayed the
        // history before the observer above was registered — so without this
        // the context keeps describing the PRIOR evaluator until something
        // else broadcasts: its streams (e.g. a Chat field's existence), and
        // its exception, which must be witnessed here so an error made while
        // editing doesn't read as news at the next play. (Skipped for the very
        // first evaluator, which runs before the store exists; the store is
        // created from it directly, just below.)
        if (evaluationReady) updateEvaluatorStores();
    }

    /** Create a store for all of the evaluation state, so that the editor nodes can update when it changes. */
    const evaluation = writable(getEvaluationContext());
    setEvaluation(evaluation);
    evaluationReady = true;

    function updateEvaluatorStores() {
        evaluation.set(getEvaluationContext());

        // If a NEW exception surfaced while playing, drop into debug mode at
        // the exception frame so the failure is explicit and inspectable,
        // rather than silently stopping the streams that depended on the
        // evaluation. Exceptions are witnessed in every mode, though: one that
        // appeared while editing (where the conflict annotations already
        // explain it) must not yank the creator into debug on their next
        // play — that reads as the play button breaking, and it disrupts the
        // editing they were in the middle of.
        // An exception is witnessed however it surfaces: `Evaluator.exception`
        // is only assigned when a LIVE evaluation ends, but a paused edit
        // shows the same failure as the program's latest value (which is how
        // the stage and annotations already display it). Without reading the
        // value, an error made while editing would be "new" at the next play.
        const exception = $evaluator.exception;
        const latest = $evaluator.getLatestSourceValue($evaluator.getMain());
        const surfaced =
            exception ??
            (latest instanceof ExceptionValue ? latest : undefined);
        const fresh =
            surfaced !== undefined && surfaced.creator !== lastSeenException;
        lastSeenException = surfaced?.creator ?? lastSeenException;
        if (uiMode === 'play' && exception !== undefined && fresh)
            setUIMode('debug', 'exception');
    }

    function getEvaluationContext() {
        return {
            evaluator: $evaluator,
            step: $evaluator.getCurrentStep(),
            stepIndex: $evaluator.getStepIndex(),
            playing: $evaluator.isPlaying(),
            streams: $evaluator.reactions,
            mode: uiMode,
            performance,
        };
    }

    /** The last project rendered. `onDestroy` runs after the parent has already
     * updated its state, so the `project` prop can read undefined there — which
     * is exactly what it did when the page unmounted the view. */
    let lastProject = project;
    $effect(() => {
        lastProject = project;
    });

    /** Clean up the evaluator when unmounting. */
    onDestroy(() => {
        catchUp.cancel();
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
            $evaluator.getLatestSourceValue(lastProject.getMain()) === undefined
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
        if (lastProject.getPreview()?.mode === 'manual') return;
        const value = $evaluator.getLatestSourceValue(lastProject.getMain());
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

    const soundingNodes = writable<Set<Node>>(new Set());
    setSoundingNodes(soundingNodes);

    /** A store for tracking editor state for all Sources */
    const editors = writable(new Map<string, EditorState>());
    setEditors(editors);

    /** Caret↔selection syncing lives entirely in Palette.svelte, which only exists while the
     *  palette is open. There's nothing to clear from here: a selection can't be made without
     *  the palette, and the palette empties it on the way out. */

    /** The conflict currently emphasized via the editor↔sidebar attention link. */
    const emphasizedConflict = writable<EmphasizedConflict | undefined>(
        undefined,
    );
    setEmphasizedConflict(emphasizedConflict);

    /** The currently focused editor state */
    const focusedEditorState = $derived(
        Array.from($editors.values()).find((editor) => editor.focused),
    );

    /** A map of tile IDs to editor components, so we can pass around references for programmatic use of editors. */
    const editorViews = $state<Record<string, Editor>>({});

    function syncTiles(project: Project, tiles: Tile[]): Tile[] {
        const newTiles: Tile[] = [];

        // Go through each tile and map it to a source file.
        // If we don't find it, remove the tile. Modes never reshape tiles:
        // evaluation state and layout are deliberately independent, so the
        // only adjustment here is the legacy edit param's request to open
        // the main source.
        for (const tile of tiles) {
            if (tile.kind !== TileKind.Source) {
                newTiles.push(tile);
            } else {
                const source = tile.getSource(project);
                if (source)
                    newTiles.push(
                        tile.withMode(
                            requestedEdit && source === project.getMain()
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
                showOutput || initialPlayLayout ? TileKind.Output : undefined,
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

    /** Fill the screen with the stage and hand it focus: what a `?mode=play`
     * load and the perform command both mean by "the performance is the whole
     * show". Callers gate on `persistLayout`, since embedded views (e.g. the
     * tutorial) own their layout and focus. */
    function fullscreenStage() {
        const output = layout.getOutput();
        if (output) {
            setFullscreen(output);
            tick().then(focusStage);
        }
    }

    // A play-mode load focuses the stage so keys reach the performance
    // immediately. Whether the stage is FULLSCREEN belongs to the layout, not
    // the mode: a first visit defaults to a fullscreen stage (see
    // getInitialLayout), while a refresh restores the persisted layout — so
    // playing beside the editor survives a reload instead of snapping back to
    // fullscreen.
    onMount(() => {
        if (initialPlayLayout && persistLayout) tick().then(focusStage);

        // After mounted, disable the requested edit.
        if (requestedEdit) requestedEdit = false;
    });

    /** When the layout or path changes, add or remove query params based on state */
    $effect(() => {
        const searchParams = new URLSearchParams(page.url.searchParams);

        // Reflect the current evaluation mode in the URL so it's restored on load and
        // shareable, migrating away from the legacy play/edit params.
        if (persistMode) {
            searchParams.set(PROJECT_PARAM_MODE, uiMode);
            searchParams.delete(PROJECT_PARAM_PLAY);
            searchParams.delete(PROJECT_PARAM_EDIT);
        }

        // Set the URL to reflect the latest concept selected.
        if (index) {
            setConceptInURL(
                $path ? currentConcept($path) : undefined,
                index,
                searchParams,
            );
        }

        // Reflect the guide's search query so a refresh restores its results.
        setQueryInURL(debouncedGuideQuery.current, searchParams);

        // Reflect the guide's browsing location (section, concept type, how-to filter).
        setEnumInURL(
            searchParams,
            PARAM_SECTION,
            guideSection,
            guideSectionFallback(),
        );
        setEnumInURL(
            searchParams,
            PARAM_PURPOSE,
            guidePurpose,
            Purpose.Outputs,
        );
        setEnumInURL(
            searchParams,
            PARAM_HOWTO,
            guideGalleryOnly ? 'gallery' : 'all',
            guideHowToFallback(),
        );

        // Update the URL, removing = for keys with no values
        const search = `${searchParams.toString().replace(/=(?=&|$)/gm, '')}`;
        const currentSearch =
            page.url.search.charAt(0) === '?'
                ? page.url.search.substring(1)
                : page.url.search;
        // If the search params haven't changed, don't navigate.
        if (search !== currentSearch)
            // Keep focus/scroll so syncing the guide URL while the creator is typing
            // in the docs search field doesn't steal focus from it.
            goto(`?${search}`, {
                replaceState: true,
                keepFocus: true,
                noScroll: true,
            });
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

    /** Which tour is currently open, if any. Tour definitions live in
     * `tours.ts` so that anything can name one — the tutorial points at them
     * with `@Tour/<id>` markup. */
    let openTour = $state<TourID | undefined>(undefined);

    /** The slot a `@Tour/<id>` reference writes to. Something above may already
     * provide one — the tutorial does, since its dialog is a sibling of this
     * view rather than a descendant — in which case we serve that one; otherwise
     * we provide our own so a reference in the guide tile still works. */
    const inheritedTourRequest = getTourRequest();
    const ownTourRequest: TourRequest = $state({ id: undefined });
    const tourRequest = inheritedTourRequest ?? ownTourRequest;
    if (inheritedTourRequest === undefined) setTourRequest(ownTourRequest);

    $effect(() => {
        const requested = tourRequest.id;
        if (requested === undefined) return;
        untrack(() => {
            // Clear first: launching may change layout, and a request that
            // outlived its launch would reopen the tour when it closed.
            tourRequest.id = undefined;
            launchTour(requested);
        });
    });

    /** Open a tour, first doing whatever setup it needs to have something to
     * point at. Preparation lives here rather than in the registry because it
     * needs this view's layout and selection state. */
    function launchTour(id: TourID) {
        if (id === 'palette') preparePaletteTour();
        else if (id === 'docs') revealTile(layout.getDocs());
        openTour = id;
    }

    /** Select any Phrase in the project so the palette has properties to
     * display, then open the palette. Falls back to the empty palette if the
     * project has no Phrase. */
    function preparePaletteTour() {
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
        // Selection no longer auto-opens the palette, so open it explicitly for the tour.
        revealPalette();
    }

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

    /** The embedded guide's search query, restored from the URL on load and
     *  synced back (debounced) so a refresh keeps the guide tile's results. */
    let guideQuery = $state(getQueryFromURL(page.url.searchParams));
    const debouncedGuideQuery = debounced(() => guideQuery, 400);

    // The embedded guide's browsing location, restored from the URL and bound to
    // Documentation so a refresh keeps the section, concept type, and how-to filter.
    const guideSectionFallback = () => ($blocks ? 'language' : 'howto');
    // How-to filter default mirrors Documentation's old context rule.
    const guideHowToFallback = () =>
        project.getGallery() == null ? 'gallery' : 'all';
    let guideSection = $state(
        getEnumFromURL(
            page.url.searchParams,
            PARAM_SECTION,
            Modes,
            guideSectionFallback(),
        ),
    );
    let guidePurpose = $state(
        getEnumFromURL(
            page.url.searchParams,
            PARAM_PURPOSE,
            Object.values(Purpose),
            Purpose.Outputs,
        ),
    );
    let guideGalleryOnly = $state(
        getEnumFromURL(
            page.url.searchParams,
            PARAM_HOWTO,
            ['gallery', 'all'] as const,
            guideHowToFallback(),
        ) === 'gallery',
    );

    /** The browse section at the bottom of the guide history (its "home"), built from
     *  the host's current section + subsection filters. */
    function guideHomeSection(): GuidePlace {
        return { kind: 'section', mode: guideSection, purpose: guidePurpose };
    }

    /** Build the initial guide history from the URL: the home section, with the
     *  named concept on top of it if the URL names one. Done when the index is
     *  first built (see the index effect below) rather than in onMount, since the
     *  index is created lazily in an effect and isn't available at mount time. */
    function conceptHistoryFromURL(builtIndex: ConceptIndex): ConceptPath {
        const concept = getConceptFromURL(builtIndex, page.url.searchParams);
        return concept
            ? [guideHomeSection(), { kind: 'concept', concept }]
            : [guideHomeSection()];
    }

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
        // Also skip the rebuild during an on-stage drag (move/rotate/resize) or
        // a palette gesture (color/number slider drag, color picker, focused
        // number/text field). Read both flags in the tracked outer scope so
        // ending the gesture (interacting/adjusting → false) re-fires this
        // effect and rebuilds once against the final project.
        const notInteracting =
            !selectedOutput.interacting && !selectedOutput.adjusting;
        const currentProject = project;

        // Wrap the rebuild logic in untrack() so that reads and writes of
        // index and $path don't create a dependency cycle: without this,
        // writing index/path would re-trigger this effect.
        untrack(() => {
            if (
                index === undefined ||
                (notTyping &&
                    notInteracting &&
                    latestProject !== currentProject) ||
                resolvedHowTos !== latestHowTos ||
                currentGalleryHowTos !== latestGalleryHowTos
            ) {
                // Whether this is the first time we're building the index, so we
                // can restore the concept named in the URL (rather than remap an
                // existing history) once the index exists.
                const firstBuild = index === undefined;

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

                // On the first build, restore the concept named in the URL so a
                // refresh keeps the guide on it; otherwise map the old history's
                // concepts to the new index, dropping any that no longer resolve
                // (search locations are preserved).
                if (path)
                    path.set(
                        newIndex
                            ? firstBuild
                                ? conceptHistoryFromURL(newIndex)
                                : $path
                                  ? remapConcepts($path, (concept) =>
                                        newIndex.getEquivalent(concept),
                                    )
                                  : []
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

    // When the path navigates to a concept, show the docs, and leave fullscreen.
    // (Gated on a current concept, not just a non-empty history, so the always-present
    // home section at the bottom of the history doesn't auto-expand the docs tile.)
    $effect(() => {
        const docs = untrack(() => layout.getDocs());
        if (
            $path &&
            currentConcept($path) !== undefined &&
            (!sameHistory($path, latestPath) ||
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
        if (docs?.isCollapsed()) path.set([guideHomeSection()]);
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

    const user = getUser();

    /**
     * Content warnings shown in the same blocking gate as permissions, for
     * read-only viewers only (`warn`). Photosensitivity is detected by static
     * analysis; moderation warnings come from a moderator's flags, and only for
     * a public project's audience (not read-only collaborators of a private
     * project). Computed synchronously (not in onMount) so the value is ready
     * before the evaluator-start effect below reads it — otherwise the effect
     * could start the evaluator before risks are known and the gate would never
     * appear.
     */
    const showModeration = $derived(warn && isAudience($user, project));

    /** Where a scratch project was opened from (#1044). Only ever a same-origin
     *  path: anything else in the parameter is someone else's link, and
     *  following it would make this an open redirect. `//host` is a protocol-
     *  relative URL, so a leading slash alone isn't enough. */
    const returnTo = $derived.by(() => {
        if (!project.isScratch()) return undefined;
        const from = page.url.searchParams.get(PROJECT_PARAM_FROM);
        return from !== null && from.startsWith('/') && !from.startsWith('//')
            ? from
            : undefined;
    });

    /** What to call the place the link goes back to. The guide names the thing
     *  being explained in its own URL, so "back to Phrase" says where you're
     *  going; anything else falls back to the guide itself. */
    const returnLabel = $derived.by(() => {
        if (returnTo === undefined) return undefined;
        const concept = new URLSearchParams(
            returnTo.slice(returnTo.indexOf('?')),
        ).get(PARAM_CONCEPT);
        return $locales
            .concretize((l) => l.ui.project.link.backTo, {
                place:
                    concept !== null && concept.length > 0
                        ? concept
                        : $locales.getPrimaryPlainText(
                              (l) => l.ui.page.guide.header,
                          ),
            })
            .toText();
    });

    /** Whether this viewer can report this project (#193). Audience only — its
     *  own creators have the share dialog for anything wrong with it — and
     *  signed in, since a report has to name who made it and an anonymous one
     *  would be neither accountable nor rate-limitable. */
    const reportable = $derived(
        isAuthenticated($user) && isAudience($user, project),
    );
    const contentWarnings = $derived<GateWarning[]>([
        ...(showModeration
            ? [
                  ...getWarnFlags(project.getFlags()).map<GateWarning>(
                      (flag) => ({ kind: 'moderation', flag, moderated: true }),
                  ),
                  ...getUnmoderatedFlags(project.getFlags()).map<GateWarning>(
                      (flag) => ({
                          kind: 'moderation',
                          flag,
                          moderated: false,
                      }),
                  ),
              ]
            : []),
        ...(warn
            ? getPhotosensitivityWarnings(project, DB, $locales.getLocales())
            : []),
        ...(warn ? getMusicWarnings(project, DB, $locales.getLocales()) : []),
    ]);
    const contentBlocks = $derived<GateBlock[]>(
        showModeration
            ? getBlockFlags(project.getFlags()).map<GateBlock>((flag) => ({
                  kind: 'moderation',
                  flag,
              }))
            : [],
    );

    const gate = new ContentGate(
        () => contentWarnings,
        () => contentBlocks,
    );

    /** Whether this project makes music, deciding if the stage toolbar offers
     * a visualization chooser. Read from the source rather than the evaluated
     * stage so the control doesn't blink in and out as conditionals change. */
    const hasMusic = $derived(
        project.getReferences($evaluator.project.shares.output.Music).length >
            0,
    );

    /**
     * Any time the evaluator of the project changes, start it — unless the
     * blocking gate is holding it: a required browser permission hasn't been
     * granted, the content is blocked, or content warnings await acknowledgment.
     * */
    let updateTimer = $state<NodeJS.Timeout | undefined>(undefined);
    $effect(() => {
        if (pendingPermissions.size > 0) return;
        if (gate.gated) return;
        if (!$evaluator.isStarted()) {
            $evaluator.start();
            // In edit and debug modes, freeze after the initial evaluation
            // completes, so the stage shows the final frame rather than running
            // live. A debug-mode reset additionally rewinds to the first step —
            // "show me the beginning" — while a mirrored rebuild (an edit)
            // keeps its replayed position.
            if (uiMode !== 'play' && $evaluator.isPlaying()) {
                $evaluator.pause();
                if (landAtStart) $evaluator.stepTo(0);
            }
            landAtStart = false;
        }
    });

    function updateConflicts() {
        // During a typing flurry skip the analysis entirely. project.analyze()
        // walks every source node, computes types and conflicts, and is
        // 50-200ms on a 100+ line program. Running it on every keystroke (and
        // throwing the result away on the next stroke) is the dominant cost
        // of typing in large files. The effect below re-fires when
        // $keyboardEditIdle leaves Typing, at which point we'll catch up.
        if ($keyboardEditIdle === IdleKind.Typing) return;

        // Likewise skip during an on-stage drag (move/rotate/resize) or a
        // palette gesture (color/number slider drag, color picker, focused
        // number/text field) — re-analyzing every frame or keystroke is the
        // same wasted cost. The effect below tracks both flags, so ending the
        // gesture (interacting/adjusting → false) re-fires this and analyzes
        // once against the final project.
        if (selectedOutput.interacting || selectedOutput.adjusting) return;

        // Analyzed? Update the conflicts immediately.
        if (project.analyzed === 'analyzed') {
            conflicts.set(project.getConflicts() ?? []);
        }
        // Not yet analyzed? Run analysis now and publish.
        else if (project.analyzed === 'unanalyzed') {
            conflicts.set(project.analyze().conflicts);
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
        // Tracked so ending an on-stage drag or palette gesture
        // (interacting/adjusting → false) re-runs analysis once.
        selectedOutput.interacting;
        selectedOutput.adjusting;
        updateConflicts();
        return () => {
            if (updateTimer) clearTimeout(updateTimer);
        };
    });

    /** When debugging and the current step changes, change the active source. */
    $effect(() => {
        if (uiMode === 'debug' && $evaluation.step) {
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

    /** Reveal the palette tile on demand. Selection changes deliberately do NOT call this — the
     *  palette follows the selection only while it's already open, so dragging or selecting the
     *  stage no longer makes the tile pop in. A stage output invokes this (via context) on a
     *  double-click or Enter to explicitly open the palette for the selected content. */
    function revealPalette() {
        revealTile(layout.getPalette());
    }
    setRevealPalette(revealPalette);

    /** Expand a collapsed tile. A tour of a tile has nothing to point at while
     *  the tile is closed, and it starts closed in an empty project and in the
     *  tutorial. */
    function revealTile(tile: Tile | undefined) {
        if (tile && tile.mode === TileMode.Collapsed)
            setMode(tile, TileMode.Expanded);
    }

    /** Whether the palette is on screen; the palette itself sets this as it mounts and unmounts. */
    const paletteOpen = writable(false);
    setPaletteOpen(paletteOpen);

    /** A marker in the code asks for a message; the conversation cannot show it
     *  while its tile is shut. The chat clears the request once it has. */
    $effect(() => {
        if ($messageRequest !== undefined)
            revealTile(layout.getTileWithID(TileKind.Collaborate));
    });

    /** Where every message's reference points right now, by message id.
     *
     *  The one place a reference is resolved. Re-derived rather than stored,
     *  because a reference names a node by a path and what that path means
     *  changes every time the program does — and resolved *here* because both
     *  readers need the same answer: the gutter markers, to know which nodes
     *  carry one, and the chip beside each message, to say which line. Resolving
     *  is not free (a path that no longer lands on its own code falls back to
     *  scanning the source), so resolving twice was paying twice per keystroke. */
    let resolvedReferenceMap = $derived.by(() => {
        const found = new Map<string, ResolvedReference>();
        if (!chat) return found;
        for (const message of chat.getMessages()) {
            if (message.reference === undefined || message.text === null)
                continue;
            found.set(message.id, resolveReference(project, message.reference));
        }
        return found;
    });

    $effect(() => {
        resolvedReferences.set(resolvedReferenceMap);
    });

    /** Where the message being written points and what to call it, so the editor
     *  holding that code can say so in its footer. One pass over the sources
     *  rather than two, since both answers come from finding the same one. */
    let linked = $derived.by(() => {
        const node = $linkedNode;
        if (node === undefined) return undefined;
        const index = project
            .getSources()
            .findIndex((source) => source.has(node));
        if (index < 0) return undefined;
        const lines = linesOfNode(project.getSources()[index], node);
        return lines === undefined
            ? undefined
            : {
                  tile: Layout.getSourceID(index),
                  label: referenceLabel(
                      $locales,
                      lines.firstLine,
                      lines.lastLine,
                  ),
              };
    });

    /** Which messages are about which code, for the marker each referenced
     *  line and block carries in its gutter. Node identity is rebuilt with the
     *  program, so this map genuinely differs on every edit; the guard against
     *  needless downstream work is in RootView, whose map is keyed by line. */
    $effect(() => {
        const byNode = new Map<Node, string[]>();
        for (const [id, resolved] of resolvedReferenceMap) {
            if (resolved.state !== 'valid') continue;
            const messages = byNode.get(resolved.node);
            if (messages) messages.push(id);
            else byNode.set(resolved.node, [id]);
        }
        referencedMessages.set(byNode);
    });

    /** When the canvas size changes, resize the layout */
    $effect(() => {
        refreshLayout();
    });

    function refreshLayout() {
        layout = untrack(() => layout).resized(
            $arrangement,
            $stagePlacement,
            canvasWidth,
            canvasHeight,
        );
    }

    let outputView = $state<OutputView | undefined>(undefined);

    /** Tracks whether the current stage value has an explicit place set, so the toolbar can show a reset-zoom button. */
    let hasStagePlace = $state(false);

    /** Tracks whether the audience has overridden the stage's computed focus, so the reset-zoom button can be disabled when there is nothing to reset. */
    let focusAdjusted = $state(false);

    /** Labels the stage's zoom controls. The app's own search idiom, forced monochrome the
     *  way the animation control's icon is — the group used to borrow the language's
     *  pattern-search operator for this, which is not chrome's to spend. */
    const ZoomIcon = withMonoEmoji('🔍');

    /** The audience's zoom, as a ratio of the project's own view; 1 is the project's. */
    let stageZoom = $state(1);
    let stageZoomPercent = $derived(zoomPercent(stageZoom));
    /** Where the gauge fills to: 0 fully out, 0.5 the project's own view, 1 fully in. */
    let stageZoomLevel = $derived(zoomGauge(stageZoom));

    let adjusting = $state(false);

    /** Take the given axis, group, and split, and adjust it. */
    function adjustSplit(axis: number, index: number, split: number) {
        layout = layout.withSplit(
            $arrangement,
            $stagePlacement,
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

    /** Recompute the bounds based every time the layout changes. Derived from the
     *  current tiles only: seeding from the previous value made these monotonic, so
     *  a canvas that was once wider (a bigger window, a since-closed tile) kept
     *  scrolling into empty space forever. */
    $effect(() => {
        const tiles = layout ? layout.tiles : [];
        maxRight = Math.max(
            0,
            ...tiles.map((tile) => tile.position.left + tile.position.width),
        );
        maxBottom = Math.max(
            0,
            ...tiles.map((tile) => tile.position.top + tile.position.height),
        );
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

    /** Svelte stores fire subscribers on subscribe; only later *changes*
     * should rebuild the evaluator, since the initial one already reflects
     * current settings and each rebuild releases and reacquires media streams. */
    function subscribeToChanges<T>(
        store: Readable<T>,
        react: () => void,
    ): () => void {
        let first = true;
        return store.subscribe(() => {
            if (first) first = false;
            else react();
        });
    }

    /** If the camera or mic changes, restart the evaluator to reflect to the new stream. */
    const cameraUnsubscribe = subscribeToChanges(camera, resetInputs);
    const micUnsubscribe = subscribeToChanges(mic, resetInputs);

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
        getMode: () => uiMode,
        setMode: (mode: ProjectMode) => setUIMode(mode),
        performProject,
        toggleBlocks,
        foldAll: focusedEditorState?.foldAll,
        unfoldAll: focusedEditorState?.unfoldAll,
        canFoldAll: focusedEditorState?.canFoldAll,
        canUnfoldAll: focusedEditorState?.canUnfoldAll,
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
                    .resized(
                        $arrangement,
                        $stagePlacement,
                        canvasWidth,
                        canvasHeight,
                    );
            }
        }
    });

    function toggleBlocks(on: boolean) {
        Settings.setBlocks(on);
    }

    /** Announce the editing mode from the setting itself, so every way of
     *  changing it — the keyboard command, the toolbar's Mode widget, the
     *  settings dialog — sounds the same. (The Mode widget's aria-checked is
     *  only read when it has focus, so the shortcut would otherwise be
     *  silent.) The initial value isn't announced. */
    let lastAnnouncedBlocks: boolean | undefined = undefined;
    $effect(() => {
        const on = $blocks;
        untrack(() => {
            if (lastAnnouncedBlocks === undefined) {
                lastAnnouncedBlocks = on;
                return;
            }
            if (on === lastAnnouncedBlocks) return;
            lastAnnouncedBlocks = on;
            if (announce && $announce)
                $announce(
                    'command',
                    $locales.getLanguages()[0],
                    $locales
                        .concretize((l) => l.ui.feedback.editMode, {
                            mode: $locales.getTextStructure(
                                (l) =>
                                    l.ui.dialog.settings.mode.blocks.labels[
                                        on ? 1 : 0
                                    ],
                            ),
                        })
                        .toText(),
                );
        });
    });

    function getTileView(tileID: string) {
        return view?.querySelector(`.tile[data-id="${tileID}"]`) ?? null;
    }

    /** Move keyboard focus to the stage output — its keyboard input when the program
     * has one, otherwise the stage itself — so play mode receives stage input
     * immediately rather than focusing toolbar controls like the tour trigger. */
    function focusStage() {
        const tileView = getTileView(TileKind.Output);
        const target =
            tileView?.querySelector('[data-defaultfocus]') ??
            tileView?.querySelector('.output .value');
        if (target instanceof HTMLElement)
            setKeyboardFocus(target, 'Focusing stage for play mode.');
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
        // Collapsing the palette used to clear the output selection here, but that covered
        // only this one gesture — play mode, fullscreen, and one-tile arrangements all hid
        // the palette and left the selection underlining code. Palette.svelte now clears it
        // when it unmounts, which is every route.
        layout = layout
            .withTileLast(tile.withMode(mode))
            .resized($arrangement, $stagePlacement, canvasWidth, canvasHeight);
    }

    function setFullscreen(tile: Tile | undefined) {
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

        // Let native form controls (a <select> dropdown, range sliders, text fields) and
        // editable regions handle their own keys, so editor commands don't consume e.g.
        // arrow-key option navigation in a dropdown. Only defer UNMODIFIED keys — the ones
        // those controls use (arrows, typing, Enter); command shortcuts like ⌘S still run,
        // so they aren't swallowed by a focused control that ignores them. Use closest() so
        // a focused <option> (whose event target is the option, not the <select>) is
        // covered. The code editor handles its own keys via its local handler.
        const target = event.target;
        if (
            !event.metaKey &&
            !event.ctrlKey &&
            target instanceof HTMLElement &&
            (target.closest('select, input, textarea') !== null ||
                target.isContentEditable)
        )
            return;

        // See if there's a command that matches...
        const [command, result] = handleKeyCommand(event, commandContext);

        // A command can decline with a reason; say it, rather than leaving the
        // keystroke silent outside the editor.
        if (typeof result === 'function') {
            if (announce && $announce)
                $announce(
                    'ignored',
                    $locales.getLanguages()[0],
                    $locales.getPrimaryPlainText(result),
                );
            return;
        }

        // If something handled it, consume the event, and reset the modifier state.
        if (result !== false) {
            announceCommand(command);
            event.stopPropagation();
            event.preventDefault();

            // Reset the key modifiers since a command was consumed.
            resetKeyModifiers();
        }
    }

    /** Announce what a command did, for commands whose effect a screen reader
     *  wouldn't otherwise convey (see Command.feedback). */
    function announceCommand(command: Command | undefined) {
        if (command === undefined || !announce || !$announce) return;
        const step = $evaluator.getCurrentStep();
        const feedback = resolveFeedback(command.feedback, {
            locales: $locales,
            zoom: undefined,
            blocks: $blocks,
            getMode: () => uiMode,
            step:
                step === undefined
                    ? undefined
                    : {
                          index: $evaluator.getStepIndex(),
                          node: step.node.getLabel($locales),
                      },
        });
        if (feedback)
            $announce(feedback.kind, $locales.getLanguages()[0], feedback.text);
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

        // The menu's containing block and clipping box is this view's own
        // `.project` — not `document.querySelector('.project')`, which matches the
        // project route's outer wrapper (also `.project`) first in document order,
        // a taller box that includes the page footer.
        if (view === undefined) return undefined;

        const projectBounds = view.getBoundingClientRect();
        // The box the menu must be clamped into, so a menu anchored near the
        // bottom of a short project isn't placed past its `overflow: hidden` edge.
        const container = {
            width: view.clientWidth,
            height: view.clientHeight,
        };

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
                container,
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
                    container,
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
                    container,
                };
            }
        }
    }

    function toggleTile(tile: Tile) {
        // In a one-tile arrangement the toggles are how you move between tiles, so
        // hiding the one you're looking at leaves nothing to look at. Single only,
        // not split: a split still has another tile showing, so collapsing one of
        // the two is an ordinary "done with the palette" gesture — and a laptop at
        // 1280x720 is already in split. TileView's own – collapses either way.
        if (
            currentArrangement === Arrangement.Single &&
            layout
                .getVisibleTiles(currentArrangement)
                .some((visible) => visible.id === tile.id)
        )
            return;

        setMode(
            tile,
            tile.mode === TileMode.Expanded && !tile.isInvisible()
                ? TileMode.Collapsed
                : TileMode.Expanded,
        );
    }

    function addSource() {
        const newProject = project.withNewSource(
            `${$locales.getUnannotatedPrimaryText((l) => getConceptName(l, 'source'))}${
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

    /** Get the localized label for a mode, for announcements. Matches the
     * switchers' editableAndCurrent gate, so what is announced is what is
     * shown. */
    function getModeLabel(mode: ProjectMode): string {
        return withoutAnnotations(
            $locales.getTextStructure((l) =>
                editableAndCurrent
                    ? l.ui.output.mode.evaluation
                    : l.ui.output.mode.evaluationView,
            ).labels[ProjectModes.indexOf(mode)],
        );
    }

    /** The single entry point for switching evaluation modes, keeping the
     * evaluator in sync. Modes never touch the layout: what's visible and
     * what's evaluating are deliberately independent, so switching modes with
     * the editor open leaves it open, and exiting fullscreen leaves the mode
     * alone. They do move keyboard focus to the mode's subject, though — see
     * the focus block at the end. The cause distinguishes who is asking: an
     * exception announces itself, and the perform command announces (and
     * starts) the fresh performance itself, so each transition has exactly one
     * describer.
     */
    function setUIMode(
        mode: ProjectMode,
        cause: 'switch' | 'exception' | 'perform' = 'switch',
    ) {
        if (mode === uiMode) return;
        uiMode = mode;

        // Whether the creator's focus is in this project, captured before the
        // surfacing below can move or unmount whatever holds it. A mode switch
        // follows their focus to the mode's subject; a mode set while they're
        // working somewhere else entirely must not yank it back. Nothing
        // focused counts as eligible: Safari doesn't focus a button on click,
        // so the mode switcher itself can leave the document unfocused.
        const active = document.activeElement;
        const focusHere =
            active === null ||
            active === document.body ||
            (view?.contains(active) ?? false);

        const currentEvaluator = $evaluator;
        if (mode === 'play') {
            currentEvaluator.setIgnoringInputs(false);
            // Switching to play always resumes from wherever the program is;
            // beginning a fresh performance is the perform and reset buttons'
            // job, and they say so explicitly. (A perform is about to replace
            // this evaluator with a fresh one, so there is nothing to resume.)
            // From a past frame, catch up first: fast-forward through the
            // recorded history so the creator sees how the present came to
            // be, then go live at its edge.
            if (cause !== 'perform') {
                if (currentEvaluator.isInPast())
                    catchUp.start(
                        currentEvaluator.reactions.filter(
                            (reaction) =>
                                reaction.stepIndex >
                                currentEvaluator.getStepIndex(),
                        ).length,
                    );
                else currentEvaluator.play();
            }
            // Playing disables stage selection, and the palette can stay
            // visible while playing now, so drop the selection rather than
            // leaving an underline nothing can explain or clear.
            if (!selectedOutput.dragging && !selectedOutput.interacting)
                selectedOutput.empty();
        } else {
            // Leaving play abandons any catch-up underway: the creator asked
            // to hold still before the present was reached.
            catchUp.cancel();
            // Edit and debug are both frozen worlds: new inputs must not extend the history.
            currentEvaluator.setIgnoringInputs(true);
            if (currentEvaluator.isPlaying()) currentEvaluator.pause();
            // Both freeze exactly where the program is — even a past frame the
            // creator scrubbed to. The always-visible timeline names the
            // position, and `StepToStart` is how a creator asks for the
            // beginning.
        }

        // Surface the tile the mode is about, so a mode switch always shows
        // its subject.
        const surfaced = surfaceTileForMode(mode);

        // Not every transition broadcasts (e.g., edit to debug while already paused),
        // so sync the evaluation context explicitly.
        updateEvaluatorStores();

        // Announce the mode switch to screen readers. The perform command
        // announces its own beginning instead.
        if (cause !== 'perform')
            announceProjectMode(
                cause === 'exception'
                    ? $locales.getPrimaryPlainText(
                          (l) => l.ui.output.mode.exception,
                      )
                    : mode === 'play'
                      ? // Naming where it picked up isn't only informative: an
                        // announcement whose text never changes is heard once
                        // and then sounds broken, and "resuming" alone would be
                        // identical on every play (see CLAUDE.md).
                        $locales
                            .concretize((l) => l.ui.output.mode.resuming, {
                                position: $evaluator.getStepIndex(),
                            })
                            .toText()
                      : $locales
                            .concretize((l) => l.ui.output.mode.announce, {
                                mode: getModeLabel(mode),
                            })
                            .toText(),
            );

        // Give the mode's subject keyboard focus, so the next keystroke reaches
        // it. Without this, switching to play beside an open editor leaves focus
        // in the editor's invisible textarea, where a keypress is a source edit
        // that silently switches back to edit mode (its requestEditable escape
        // hatch) instead of reaching the stage (#1285). Deferred a tick, since
        // surfacing may have just expanded a tile that wasn't rendered — and
        // deferred until after the announcement, so the mode reaches the paced
        // live region before the focus change speaks, the same order the perform
        // command uses. Only a deliberate switch moves focus: an exception's jump
        // to debug is automatic and shouldn't move the creator, and a perform
        // fullscreens and focuses the stage itself.
        if (cause === 'switch' && focusHere)
            tick().then(() =>
                mode === 'play' ? focusStage() : focusTile(surfaced?.id),
            );
    }

    /** Announce on the project-mode lane, in the primary language, matching
     * the live region's declared lang. */
    function announceProjectMode(text: string) {
        if (announce && $announce)
            $announce('project-mode', $locales.getLanguages()[0], text);
    }

    /** Whether the output tile — home of the debugger's step controls and
     * timeline — is not on screen: collapsed, zeroed out by a single/split
     * arrangement, or covered by another tile's fullscreen. When it is hidden
     * in debug mode, the controls float over whatever is visible instead. */
    const outputTileHidden = $derived.by(() => {
        const output = layout.getOutput();
        return (
            output === undefined ||
            !output.isExpanded() ||
            output.isInvisible() ||
            (layout.fullscreenID !== undefined &&
                layout.fullscreenID !== output.id)
        );
    });

    /** Make the tile a mode is about visible: edit and debug are about the
     * active source, play is about the stage. Expanding and raising it covers
     * every way a tile can be hidden — collapsed by hand, or pushed out of the
     * single/split arrangements, which show only the most recently raised one
     * or two — and a fullscreen tile that ISN'T the subject is exited, since
     * it would cover the subject entirely (this is also what exits the stage's
     * fullscreen when returning to edit). Returns the tile it surfaced, so the
     * caller can hand it focus without working out the subject a second time. */
    function surfaceTileForMode(mode: ProjectMode) {
        const tile =
            mode === 'play'
                ? layout.getOutput()
                : (layout.getSource(selectedSourceIndex) ??
                  layout.getTileWithID(Layout.getSourceID(0)));
        if (tile === undefined) return undefined;
        if (
            layout.fullscreenID !== undefined &&
            layout.fullscreenID !== tile.id
        )
            setFullscreen(undefined);
        setMode(tile, TileMode.Expanded);
        return tile;
    }

    /**
     * The perform command: begin a fresh performance — restart the program,
     * enter play mode, and fullscreen the stage — from any mode, including
     * play, where starting over in fullscreen is just as useful. The
     * complement to the mode switch, which always resumes: this is the
     * trigger that always starts from the top. (Switching to edit is the way
     * out, and it exits the stage's fullscreen itself.)
     */
    function performProject() {
        // Enter play before resetting: the auto-start effect reads the
        // mode when the fresh evaluator arrives, and leaves it running
        // only if the mode is already play. (Already playing? setUIMode
        // no-ops and the reset below does the work.)
        setUIMode('play', 'perform');
        resetInputs();
        // The performance number varies every firing, so consecutive
        // performances are each heard (an unchanging announcement is heard
        // once and then sounds broken; see CLAUDE.md).
        announceProjectMode(
            $locales
                .concretize((l) => l.ui.output.mode.performing, {
                    number: performance,
                })
                .toText(),
        );
        if (persistLayout) fullscreenStage();
    }

    function revert() {
        if (original) Projects.reviseProject(original);
    }

    /** A project with no name — a scratch copy of an example, or one nobody has
     *  named yet — would otherwise leave the tab titled "Wordplay - ", which is
     *  both a WCAG failure and useless for telling two open projects apart. */
    const documentTitle = $derived.by(() => {
        const name = getLocalizedProjectName(project, $locales);
        return name.length > 0
            ? name
            : $locales.getPrimaryPlainText((l) => l.ui.project.untitled);
    });
</script>

<svelte:head><title>Wordplay - {documentTitle}</title></svelte:head>

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

<!-- Audible re-evaluation cues, which render nothing. -->
<EvaluationCues />

<!-- Content warnings (moderation, photosensitivity) are shown to read-only
     viewers in the output's blocking start gate, unified with permissions. -->
<!-- Render the current project. -->
<main class="project" class:dragging={dragged !== undefined} bind:this={view}>
    <!-- The canvas pointer handlers implement tile drag and free-arrangement
         positioning; keyboard equivalents live on each tile's own focusable
         controls, so the container itself is deliberately not focusable and
         has no widget role. -->
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
            <!-- The evaluation controls, declared here so three surfaces can
                 render them: the output tile's toolbar, its subtoolbar, and
                 the floating debug controls shown when that tile is hidden.
                 None of them depend on the tile being iterated. -->
            {#snippet outputMode()}
                <!-- editableAndCurrent, not editable: browsing an
                     old checkpoint is read-only, so the first mode
                     says 👁 view there, matching the editor. -->
                <Mode
                    modes={editableAndCurrent
                        ? (l) => l.ui.output.mode.evaluation
                        : (l) => l.ui.output.mode.evaluationView}
                    icons={editableAndCurrent
                        ? ProjectModeIcons
                        : ProjectModeViewIcons}
                    choice={ProjectModes.indexOf(uiMode)}
                    select={(index) => setUIMode(ProjectModes[index])}
                    labeled={false}
                    modeLabels={false}
                    uiid="modeSwitcher"
                />
            {/snippet}
            {#snippet outputRestart()}
                <CommandButton background command={Restart} />
            {/snippet}
            {#snippet outputPerform()}
                <CommandButton
                    background
                    command={Perform}
                    icon={PerformIcon}
                />
            {/snippet}
            <!-- Anchor the `stepControls` UI reference (tutorial highlight + tour)
                 on the leftmost, most overflow-stable step button. -->
            {#snippet stepToStartItem()}<CommandButton
                    command={StepToStart}
                    uiid="stepControls"
                />{/snippet}
            {#snippet stepBackInputItem()}<CommandButton
                    command={StepBackInput}
                />{/snippet}
            {#snippet stepBackNodeItem()}<CommandButton
                    command={StepBackNode}
                />{/snippet}
            {#snippet stepBackItem()}<CommandButton
                    command={StepBack}
                />{/snippet}
            {#snippet stepOutItem()}<CommandButton
                    command={StepOut}
                />{/snippet}
            {#snippet stepForwardItem()}<CommandButton
                    command={StepForward}
                />{/snippet}
            {#snippet stepForwardNodeItem()}<CommandButton
                    command={StepForwardNode}
                />{/snippet}
            {#snippet stepForwardInputItem()}<CommandButton
                    command={StepForwardInput}
                />{/snippet}
            {#snippet stepToPresentItem()}<CommandButton
                    command={StepToPresent}
                />{/snippet}
            <!-- In edit mode the timeline navigates the input
                 history, so it snaps by reaction; debug stops at
                 every step. -->
            {#snippet timelineSlider()}<Timeline
                    evaluator={$evaluator}
                    granularity={uiMode === 'edit' ? 'input' : 'step'}
                />{/snippet}
            <!-- Edit mode shows the timeline alone: it names the
                 paused position and snaps to prior inputs, which is
                 useful while authoring, but the nine precise step
                 buttons are debugger apparatus most editing never
                 touches — showing them all the time reads as a
                 cockpit. Debug mode adds them on their own line
                 above the slider. With no reactions beyond the
                 program's start, edit hides the row entirely:
                 there is no history to navigate. -->
            {#snippet outputTimelineRow()}
                <div class="step-controls">
                    {@render timelineSlider()}
                </div>
            {/snippet}
            <!-- The debugger's controls: the step buttons on one
                 line, the history slider on its own beneath them.
                 Sharing one line meant the slider could only get
                 wider by pushing step buttons into the overflow
                 menu — measured at 73px of a 403px toolbar, which
                 is not a scrubber anyone can aim at, and 240px of
                 reserved width hid six of the nine buttons. On its
                 own line it is full width and hides nothing. -->
            {#snippet outputStepRow()}
                <div class="step-controls">
                    <OverflowToolbar
                        items={[
                            stepToStartItem,
                            stepBackInputItem,
                            stepBackNodeItem,
                            stepBackItem,
                            stepOutItem,
                            stepForwardItem,
                            stepForwardNodeItem,
                            stepForwardInputItem,
                            stepToPresentItem,
                        ]}
                    />
                    {@render timelineSlider()}
                </div>
            {/snippet}
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
                            subtoolbar={tile.kind !== TileKind.Output ||
                            uiMode === 'play'
                                ? undefined
                                : uiMode === 'debug'
                                  ? outputStepRow
                                  : $evaluation.streams.length > 1
                                    ? outputTimelineRow
                                    : undefined}
                            editable={editableAndCurrent}
                            arrangement={$arrangement}
                            background={tile.kind === TileKind.Output
                                ? outputBackground
                                : null}
                            headerBackground={tile.kind === TileKind.Output &&
                            uiMode === 'debug'
                                ? 'var(--wordplay-evaluation-color)'
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
                                // Exiting fullscreen reveals the arrangement
                                // exactly as it was, and keeps the current
                                // evaluation mode — a playing stage keeps
                                // playing beside the editor.
                                setFullscreen(fullscreen ? tile : undefined);
                            }}
                        >
                            {#snippet title()}{/snippet}

                            {#snippet controls()}
                                <!-- Reporting sits in the stage's top corner,
                                     next to fullscreen, and only for someone
                                     who is an audience for this project: its
                                     own creators have the share dialog, and
                                     nobody can report what isn't public. -->
                                {#if tile.kind === TileKind.Output && reportable && isAuthenticated($user)}
                                    <ReportButton {project} />
                                {/if}
                            {/snippet}

                            {#snippet help()}
                                {#if tile.kind === TileKind.Output}
                                    <Button
                                        tip={(l) => l.ui.output.tour.launch}
                                        background="circular"
                                        icon={INFO_SYMBOL}
                                        uiid="stageTourLaunch"
                                        action={() => {
                                            launchTour('stage');
                                        }}
                                    ></Button>
                                {:else if tile.kind === TileKind.Source}
                                    <Button
                                        tip={(l) => l.ui.source.tour.launch}
                                        background="circular"
                                        icon={INFO_SYMBOL}
                                        uiid="sourceTourLaunch"
                                        action={() => {
                                            launchTour('source');
                                        }}
                                    ></Button>
                                {:else if tile.kind === TileKind.Documentation}
                                    <Button
                                        tip={(l) => l.ui.docs.tour.launch}
                                        background="circular"
                                        icon={INFO_SYMBOL}
                                        uiid="docsTourLaunch"
                                        action={() => {
                                            launchTour('docs');
                                        }}
                                    ></Button>
                                {:else if tile.kind === TileKind.Palette}
                                    <Button
                                        tip={(l) => l.ui.palette.tour.launch}
                                        background="circular"
                                        icon={INFO_SYMBOL}
                                        uiid="paletteTourLaunch"
                                        action={() => launchTour('palette')}
                                    ></Button>
                                {:else if tile.kind === TileKind.Collaborate}
                                    <Button
                                        tip={(l) =>
                                            l.ui.collaborate.tour.launch}
                                        background="circular"
                                        icon={INFO_SYMBOL}
                                        uiid="collaborateTourLaunch"
                                        action={() => {
                                            launchTour('collaborate');
                                        }}
                                    ></Button>
                                {/if}
                            {/snippet}

                            {#snippet extra()}
                                <!-- A third home for the evaluation mode switcher.
                                     Fullscreen unmounts the project footer, which
                                     holds the only copy whenever the output tile
                                     isn't on screen — so fullscreening the editor
                                     (a tap away in its own toolbar) left no way to
                                     reach play or debug at all. The output tile
                                     pins its own copy, so it's excluded here. -->
                                {#if layout.fullscreenID === tile.id && tile.kind !== TileKind.Output}
                                    {@render outputMode()}
                                {/if}
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
                                    {#snippet outputCopy()}
                                        {#if !editable}<RemixButton {project}
                                            ></RemixButton>{/if}
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
                                            <!-- Labels the group rather than acting, so it
                                                 is hidden from screen readers: each button
                                                 already carries its own label. Mono so it
                                                 sits with the glyphs instead of shouting
                                                 over them. -->
                                            <span
                                                class="zoom-icon"
                                                aria-hidden="true"
                                                >{ZoomIcon}</span
                                            ><Button
                                                uiid="stageZoomOut"
                                                background
                                                action={() =>
                                                    outputView?.adjustZoom(-1)}
                                                tip={(l) =>
                                                    l.ui.output.button.zoomOut}
                                                >–</Button
                                            >
                                            <!-- The clear control, in the middle, always
                                                 present. Always, because it used to appear
                                                 and vanish with the adjustment and carry a
                                                 percentage whose width changed with its
                                                 value — three widths, changing on every
                                                 gesture, which made the toolbar re-decide
                                                 what to collapse and sent other controls
                                                 hopping into the overflow menu. A gauge is
                                                 the same information at a constant width,
                                                 and it shows the level moving rather than
                                                 only reporting it. The exact percentage is
                                                 still spoken: it is in this button's label,
                                                 which is why the gauge itself is hidden from
                                                 screen readers. -->
                                            <Button
                                                uiid="stageZoomReset"
                                                classes="zoom-reset"
                                                active={focusAdjusted}
                                                action={() =>
                                                    outputView?.resetZoom()}
                                                tip={() =>
                                                    stageZoomPercent === 100
                                                        ? $locales.getPrimaryPlainText(
                                                              (l) =>
                                                                  l.ui.output
                                                                      .button
                                                                      .resetZoom,
                                                          )
                                                        : $locales
                                                              .concretize(
                                                                  (l) =>
                                                                      l.ui
                                                                          .output
                                                                          .button
                                                                          .resetZoomAt,
                                                                  {
                                                                      percent:
                                                                          stageZoomPercent,
                                                                  },
                                                              )
                                                              .toText()}
                                                background
                                                ><span
                                                    class="zoom-gauge"
                                                    style:--level={stageZoomLevel}
                                                    aria-hidden="true"
                                                ></span></Button
                                            ><Button
                                                uiid="stageZoomIn"
                                                background
                                                action={() =>
                                                    outputView?.adjustZoom(1)}
                                                tip={(l) =>
                                                    l.ui.output.button.zoomIn}
                                                >+</Button
                                            >
                                        </span>
                                    {/snippet}
                                    {#snippet outputGridFit()}
                                        <!-- The fit toggle is inactive when the program sets
                                             its own camera, since it is already framing the
                                             stage and there is nothing for fitting to do. -->
                                        <span class="grid-fit">
                                            <Toggle
                                                uiid="stageGrid"
                                                tips={(l) =>
                                                    l.ui.output.toggle.grid}
                                                on={grid}
                                                toggle={() => (grid = !grid)}
                                                ><Emoji text="▦" /></Toggle
                                            ><Toggle
                                                uiid="stageLock"
                                                tips={(l) =>
                                                    l.ui.output.toggle.fit}
                                                on={fit}
                                                active={!hasStagePlace}
                                                toggle={() => (fit = !fit)}
                                                ><Emoji
                                                    text={fit ? '🔒' : '🔓'}
                                                /></Toggle
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
                                    {#snippet outputMusic()}
                                        <!-- Only offered when the project has
                                             music; a visualization chooser on
                                             a silent project is noise. -->
                                        {#if hasMusic}
                                            <label
                                                class="output-locale"
                                                data-uiid="stageMusicVisualization"
                                                >🎼
                                                <Options
                                                    value={$musicVisualization}
                                                    label={(l) =>
                                                        l.ui.dialog.settings
                                                            .mode
                                                            .musicVisualization
                                                            .label}
                                                    options={MusicVisualizations.map(
                                                        (visualization, i) => ({
                                                            value: visualization,
                                                            label: MusicVisualizationIcons[
                                                                i
                                                            ],
                                                        }),
                                                    )}
                                                    change={(v) =>
                                                        Settings.setMusicVisualization(
                                                            v === undefined
                                                                ? 'orchestra'
                                                                : toMusicVisualization(
                                                                      v,
                                                                  ),
                                                        )}
                                                />
                                            </label>
                                        {/if}
                                    {/snippet}
                                    <!-- The mode switcher, perform, and reset are pinned so they
                                         never overflow into the hamburger: they are the evaluation
                                         controls for the whole project, and they are the same three
                                         in every mode so nothing jumps around on a mode switch. -->
                                    <OverflowToolbar
                                        pinnedStart={[
                                            outputMode,
                                            outputPerform,
                                            outputRestart,
                                        ]}
                                        items={[
                                            outputCopy,
                                            outputLocale,
                                            outputZoom,
                                            outputGridFit,
                                            outputAnimation,
                                            outputMusic,
                                        ]}
                                    />
                                {:else if tile.isSource()}
                                    {#if !editable}<RemixButton {project}
                                        ></RemixButton>{/if}
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
                                        bind:query={guideQuery}
                                        bind:mode={guideSection}
                                        bind:purpose={guidePurpose}
                                        bind:galleryOnly={guideGalleryOnly}
                                    />
                                {:else if tile.kind === TileKind.Palette}
                                    <Palette
                                        {project}
                                        editable={editableNow}
                                        mode={uiMode}
                                        enterEditMode={editableAndCurrent
                                            ? () => setUIMode('edit')
                                            : undefined}
                                        editors={Array.from($editors.values())}
                                    />
                                {:else if tile.kind === TileKind.Output}
                                    <OutputView
                                        bind:this={outputView}
                                        {project}
                                        evaluator={$evaluator}
                                        value={latestValue}
                                        source={$evaluator.project.getSources()[
                                            selectedSourceIndex
                                        ]}
                                        bind:fit
                                        bind:grid
                                        bind:hasStagePlace
                                        bind:focusAdjusted
                                        bind:zoom={stageZoom}
                                        bind:background={outputBackground}
                                        editable={editableNow}
                                        selectable={editableAndCurrent &&
                                            uiMode !== 'play'}
                                        pauseOverlay={uiMode !== 'play'}
                                        onretry={() => updateEvaluator(project)}
                                        warnings={gate.pending}
                                        blocks={gate.blocks}
                                        onacknowledge={gate.acknowledge}
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
                                                editable={editableNow}
                                                requestEditable={editableAndCurrent
                                                    ? () => {
                                                          setUIMode('edit');
                                                          return true;
                                                      }
                                                    : undefined}
                                                values={uiMode === 'debug'}
                                                searchable
                                                sourceID={tile.id}
                                                selected={source ===
                                                    selectedSource}
                                                autofocus={autofocus &&
                                                    uiMode !== 'play' &&
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
                                                multipleSources={sources.length >=
                                                    2}
                                                notify={getEditorNotifier(
                                                    tile.id,
                                                )}
                                            />
                                        </div>
                                    {/if}
                                {/if}
                            {/snippet}
                            {#snippet contentFooter()}
                                <!-- Footer notifications (large deletions, drag/paste
                                     feedback), the clipboard contents, the checkpoint
                                     banner, and the collaborator presence row. Rendered
                                     below the scroll viewport (not floating over it) so
                                     they stay visible and never hide the caret or nodes;
                                     sized to the editor's width, not the full tile footer. -->
                                {#if tile.kind === TileKind.Source && editable}
                                    {@const notifications =
                                        editorNotifications.get(tile.id) ?? []}
                                    <div class="editor-notifications">
                                        {#each notifications as notification (notification.id)}
                                            <EditorNotice
                                                dismiss={() =>
                                                    getEditorNotifier(
                                                        tile.id,
                                                    ).clear(notification.id)}
                                                >{#if 'markup' in notification.content}{#if notification.content.prefix}<strong
                                                            ><LocalizedText
                                                                path={notification
                                                                    .content
                                                                    .prefix}
                                                            /></strong
                                                        >&nbsp;{/if}<MarkupHTMLView
                                                        markup={notification
                                                            .content.markup}
                                                        inline
                                                    />{:else}<LocalizedText
                                                        path={notification
                                                            .content.path}
                                                    />{/if}</EditorNotice
                                            >
                                        {/each}
                                        <!-- What the message being written is
                                             about, while it is about anything.
                                             In the footer with the other
                                             prompts, rather than over the code
                                             it names. -->
                                        {#if linked !== undefined && linked.tile === tile.id}
                                            <EditorNotice
                                                ><MarkupHTMLView
                                                    inline
                                                    markup={[
                                                        (l) =>
                                                            l.ui.collaborate
                                                                .reference
                                                                .prompt,
                                                        {
                                                            location:
                                                                linked.label,
                                                        },
                                                    ]}
                                                /></EditorNotice
                                            >
                                        {/if}
                                        <!-- The clipboard's current contents, shown on the
                                             selected editor so it appears once. The close
                                             button clears Wordplay's clipboard. -->
                                        {#if $ClipboardContents !== undefined && getSourceIndexByID(tile.id) === selectedSourceIndex}
                                            <ClipboardNotice
                                                text={$ClipboardContents}
                                                dismiss={clearInternalClipboard}
                                            />
                                        {/if}
                                        <!-- What a scratch project is, and the
                                             two things worth doing with it.
                                             Here rather than in the project
                                             footer because the whole point of
                                             the copy is to edit it, so this is
                                             where someone is looking. Only on
                                             the selected editor, so a project
                                             with several files says it once. -->
                                        {#if project.isScratch() && getSourceIndexByID(tile.id) === selectedSourceIndex}
                                            <EditorNotice>
                                                <div class="scratch">
                                                    <span class="explanation"
                                                        ><MarkupHTMLView
                                                            inline
                                                            markup={(l) =>
                                                                l.ui.project
                                                                    .scratch}
                                                        /></span
                                                    >
                                                    <span class="actions">
                                                        <RemixButton
                                                            {project}
                                                        />{#if returnTo !== undefined && returnLabel !== undefined}<Link
                                                                to={returnTo}
                                                                >{returnLabel}</Link
                                                            >{/if}
                                                    </span>
                                                </div>
                                            </EditorNotice>
                                        {/if}
                                        <!-- "Viewing an older checkpoint — Restore" banner. -->
                                        {#if checkpointed}
                                            <EditorNotice
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
                                                    action={() => {
                                                        // Save a version of the project with the current source in the history and the new source the old source.
                                                        Projects.reviseProject(
                                                            getCheckpointProject(
                                                                project.withCheckpoint(),
                                                            ),
                                                        );
                                                        checkpoint = null;
                                                    }}
                                                    label={(l) =>
                                                        l.ui.checkpoints.button
                                                            .restore}
                                                /></EditorNotice
                                            >
                                        {/if}
                                        <!-- Collaborator presence bar uses the same
                                             EditorNotice motif (see RemoteCarets). Renders
                                             nothing when the local user is the only editor. -->
                                        <RemoteCarets
                                            projectID={project.getID()}
                                        />
                                    </div>
                                {/if}
                            {/snippet}
                            {#snippet footer()}
                                {#if tile.kind === TileKind.Source && editable}
                                    {#if editableNow}<GlyphInserter
                                            sourceID={tile.id}
                                        />{/if}
                                {/if}
                            {/snippet}
                            {#snippet startMargin()}
                                {#if tile.kind === TileKind.Source && editable && $blocks}
                                    {@const source = getSourceByTileID(tile.id)}
                                    {#if source}
                                        <Wellspring {project} />
                                    {/if}
                                {/if}
                            {/snippet}
                            {#snippet margin()}
                                {#if tile.kind === TileKind.Source}
                                    {@const source = getSourceByTileID(tile.id)}
                                    {#if source}
                                        <Annotations
                                            {project}
                                            evaluator={$evaluator}
                                            {source}
                                            sourceID={tile.id}
                                            editable={editableNow}
                                            conflicts={visibleConflicts}
                                            stepping={uiMode === 'debug'}
                                            caret={$editors.get(tile.id)
                                                ?.displayedCaret}
                                            expanded={localAnnotationsExpanded}
                                            onToggle={annotationsExpanded !==
                                            undefined
                                                ? () =>
                                                      (localAnnotationsExpanded =
                                                          !localAnnotationsExpanded)
                                                : undefined}
                                        />{/if}
                                {/if}
                            {/snippet}
                        </TileView>
                    {/if}
                {/each}
                <!-- If in a layout that supports resizing, create an adjuster for each axis split in the current layout that isn't the first in the axis. Skip when a tile is fullscreen, since there's nothing to resize. -->
                {#if isResizeable(currentArrangement) && !layout.isFullscreen()}
                    {#each layout.getSplits(currentArrangement, $stagePlacement, canvasWidth, canvasHeight) ?? [] as axis, axisIndex}
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
            <!-- The debugger's controls, floated over whatever tile is
                 visible when their home — the output tile's subtoolbar — is
                 hidden (collapsed, pushed out by a single/split arrangement,
                 or covered by another tile's fullscreen). Debug surfaced the
                 editor, and on a phone's one-tile layout there would otherwise
                 be no way to step at all. -->
            {#if uiMode === 'debug' && outputTileHidden}
                <div class="floating-debug saturated-surface">
                    {@render outputStepRow()}
                </div>
            {/if}
        {/key}
    </div>

    {#if !layout.isFullscreen()}
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
            mode={uiMode}
            setMode={setUIMode}
            {revert}
            {addSource}
            {toggleTile}
            launchTour={() => launchTour('project')}
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

{#if openTour !== undefined}
    <Tour
        explanations={TourSteps[openTour]}
        subheader={Tours[openTour].subheader}
        close={() => {
            // Closing is what counts as having taken it, wherever it was
            // launched from, so the tutorial never holds someone at a tour
            // they've already seen from a tile's ⓘ button.
            if (openTour !== undefined) Settings.markTourTaken(openTour);
            openTour = undefined;
        }}
    />
{/if}

<style>
    /* The debugger's controls when their home tile is hidden: pinned above
       the footer, in the debug band's own color so they read as the same
       instrument. */
    /* The sentence takes the room it needs and wraps; the two controls stay
       together at the inline end. Letting them share the text's flow instead
       broke "back to Group" across lines and left the wrapped lines touching. */
    .scratch {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--wordplay-spacing);
        width: 100%;
    }

    /* A basis rather than `auto`: the controls never shrink, so without a
       floor the sentence gets squeezed to one word per line in a narrow
       editor. Below the floor the controls wrap to their own line instead,
       still at the inline end. */
    .scratch .explanation {
        flex: 1 1 16em;
        min-width: 0;
        line-height: 1.4;
    }

    .scratch .actions {
        flex: 0 0 auto;
        margin-inline-start: auto;
        white-space: nowrap;
    }

    /* Baseline again inside the group: a button is a flex container, so it
       contributes its own box baseline unless its content is aligned too. */
    .scratch .actions :global(button) {
        align-items: baseline;
    }

    .scratch .actions :global(.link) {
        margin-inline-start: var(--wordplay-spacing);
    }

    .floating-debug {
        position: absolute;
        inset-block-end: var(--wordplay-spacing);
        inset-inline: var(--wordplay-spacing);
        z-index: 2;
        background: var(--wordplay-evaluation-color);
        color: var(--wordplay-background);
        fill: var(--wordplay-background);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        box-shadow: 2px 2px 5px var(--wordplay-chrome);
    }

    /* Plain block, not flex: the toolbar and the slider each take the full
       width on their own line, and the slider's own `flex: 1` is inert here. */
    .step-controls {
        width: 100%;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: calc(var(--wordplay-spacing) / 2);
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
    }

    /* Suppress native touch gestures only while a tile is actually being dragged.
       Applying it unconditionally reached every scroller inside the project —
       effective touch-action is an inherited intersection, so a descendant can't
       re-permit it — and left the editor unscrollable by touch. */
    .project.dragging {
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
        /* `min-width: fit-content` widens to the code only when it actually
           overflows (no-wrap mode) so the editor can scroll horizontally; in
           soft-wrap mode fit-content collapses to the viewport so the editor
           wraps instead of growing unbounded. `min-height: 100%` keeps short
           code filling the viewport so clicks below it still land in the editor. */
        width: 100%;
        min-width: fit-content;
        min-height: 100%;
    }

    .editor-notifications {
        /* The notification band sits in TileView's non-scrolling content footer,
           directly below the editor's scroll viewport (see TileView's
           `contentFooter`), so it stays visible and shrinks the viewport rather
           than floating over the code and hiding the caret. Every item is an
           EditorNotice (or contains one), so they share one rectangular,
           integrated design and stack contiguously via their top borders. */
        width: 100%;
        display: flex;
        flex-direction: column;
    }

    /* The zoom level, as a bar filling a fixed-size track with a line across the middle
       marking the project's own view. Fixed size is the point: this control used to carry a
       percentage, and a number that changes width as it changes value is what made the
       toolbar reshuffle. Drawn with a --level custom property like MusicView's bars. */
    .zoom-gauge {
        display: inline-block;
        position: relative;
        vertical-align: middle;
        width: 6px;
        height: var(--wordplay-widget-height);
        background: var(--wordplay-alternating-color);
        /* The track is nearly the same value as the surface behind it (1.1:1), so the
           border is what makes its extent visible; the fill and the line below are the
           parts that carry meaning and they clear 3:1 on their own. */
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        overflow: hidden;
    }

    /* Fills from the bottom. Its own color rather than currentColor, so the button going
       inactive at home cannot wash out the reading. */
    .zoom-gauge::before {
        content: '';
        position: absolute;
        inset-inline: 0;
        bottom: 0;
        height: calc(var(--level) * 100%);
        background: var(--wordplay-foreground);
        transition: height calc(var(--animation-factor) * 100ms);
    }

    /* The project's own view. The fill crosses it, so it has to read against both the fill
       and the empty track — orange is the one token that clears 3:1 on both in both modes. */
    .zoom-gauge::after {
        content: '';
        position: absolute;
        inset-inline: 0;
        top: 50%;
        height: var(--wordplay-border-width);
        background: var(--color-orange-text);
    }

    /* Tighter than its neighbours so a taller gauge still leaves the three buttons the
       same outer height. */
    :global(button.zoom-reset.background) {
        padding: var(--wordplay-spacing-half);
    }

    /* Sized down from the buttons it labels: it names the group, it isn't a control. */
    .zoom-icon {
        font-size: var(--wordplay-small-font-size);
    }

    /* Group the zoom controls so the Tour can highlight them together. */
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
