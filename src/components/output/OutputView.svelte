<script lang="ts">
    import Fonts from '@basis/faces/Fonts';
    import Emoji from '@components/app/Emoji.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import {
        resizedOutput,
        resizeIsIncremental,
        rotatedOutput,
    } from '@components/output/editHandles';
    import type { GateBlock, GateWarning } from '@components/output/gate';
    import type PaintingConfiguration from '@components/output/PaintingConfiguration';
    import SensorMonitor from '@components/output/SensorMonitor.svelte';
    import { SensorPanelStack } from '@components/output/SensorPanelStack.svelte';
    import StageView from '@components/output/StageView.svelte';
    import StartGate from '@components/output/StartGate.svelte';
    import {
        DOMRectCenter,
        DOMRectDistance,
    } from '@components/output/utilities';
    import moveOutput, {
        addStageContent,
    } from '@components/palette/editOutput';
    import {
        getAnnouncer,
        getConceptIndex,
        getEvaluation,
        getKeyboardEditIdle,
        getPaletteOpen,
        getRevealPalette,
        getSelectedOutput,
        IdleKind,
        setSensorPanelStack,
    } from '@components/project/Contexts';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import ValueView from '@components/values/ValueView.svelte';
    import { default as ButtonUI } from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    // Named to avoid colliding with the Button input stream imported below.
    import ButtonWidget from '@components/widgets/Button.svelte';
    import Note from '@components/widgets/Note.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { animationFactor, DB, locales, voice } from '@db/Database';
    import { Projects } from '@db/projects/Projects';
    import type Project from '@db/projects/Project';
    import Button from '@input/Button/Button';
    import Camera from '@input/Camera/Camera';
    import Chat from '@input/Chat/Chat';
    import Choice from '@input/Choice/Choice';
    import Face from '@input/Face/Face';
    import { prefetch as prefetchFace } from '@input/Face/FaceLandmarker';
    import { faceLandmarkerStatus } from '@input/Face/FaceLandmarkerLoader.svelte';
    import Hand from '@input/Hand/Hand';
    import { prefetch as prefetchHand } from '@input/Hand/HandLandmarker';
    import { handLandmarkerStatus } from '@input/Hand/HandLandmarkerLoader.svelte';
    import Key from '@input/Key/Key';
    import analyzeProjectKeys from '@input/Key/analyzeProjectKeys';
    import KeyPadView from '@components/output/KeyPadView.svelte';
    import { TouchSupported } from '@components/util/TouchSupported';
    import { prefetch as prefetchObjects } from '@input/Objects/ObjectDetector';
    import { objectDetectorStatus } from '@input/Objects/ObjectDetectorLoader.svelte';
    import Objects from '@input/Objects/Objects';
    import {
        consent,
        grantConsent,
        type PermissionName,
    } from '@input/permissions';
    import Pitch from '@input/Pitch/Pitch';
    import Placement from '@input/Placement/Placement';
    import Pointer from '@input/Pointer/Pointer';
    import SpeechStream from '@input/Speech/Speech';
    import Volume from '@input/Volume/Volume';
    import concretize from '@locale/concretize';
    import getConceptName from '@locale/getConceptName';
    import type LocaleText from '@locale/LocaleText';
    import Evaluate from '@nodes/Evaluate';
    import { describeColorLocalized } from '@output/Color/BasicColors';
    import Color, { toColor } from '@output/Color/Color';
    import {
        PX_PER_METER,
        rootScale,
        screenToStage,
    } from '@output/Output/outputToCSS';
    import Say from '@output/Output/Say';
    import { shouldDuckMusic } from '@output/Music/ducking';
    import speech, { SaySource } from '@output/Speech/speech';
    import Caption from '@components/output/Caption.svelte';
    import { musicVisualization } from '@db/Database';
    import { musicFloorHeight } from '@db/settings/MusicSettings';
    import { acquireMusicPlayer } from '@output/Music/players';
    import { isPreviewing } from '@output/Music/previewPlayer';
    import samples from '@output/Music/InstrumentSamples';
    import { instrumentSamplesStatus } from '@output/Music/instrumentSamplesStatus.svelte';
    import { toInstrumentKey } from '@output/Music/instruments';
    import referencedInstruments, {
        instrumentBinds,
    } from '@output/Music/referencedInstruments';
    import type Source from '@nodes/Source';
    import { musicInstruments, type MusicData } from '@output/Music/musicData';
    import { missedReplays } from '@output/Music/missedReplays';
    import projectReplaysMusic from '@output/Music/replayBinding';
    import audio, { musicSuspended } from '@output/Music/MusicAudio';
    import { musicDucking, musicVolume } from '@db/Database';
    import { NameGenerator, toStage } from '@output/Output/Stage';
    import { toOutput } from '@output/Output/toOutput';
    import { getOrCreatePlace } from '@output/Place/getOrCreatePlace';
    import exceedsMoveThreshold from '@components/output/moveThreshold';
    import Place, { createPlace } from '@output/Place/Place';
    import { toExpression } from '@parser/parseExpression';
    import { PAUSE_SYMBOL } from '@parser/Symbols';
    import type Evaluator from '@runtime/Evaluator';
    import BoolValue from '@values/BoolValue';
    import describeValueChange, {
        renderValueForSpeech,
    } from '@values/describeChange';
    import ExceptionValue from '@values/ExceptionValue';
    import NoneValue from '@values/NoneValue';
    import NumberValue from '@values/NumberValue';
    import PermissionException from '@values/PermissionException';
    import StructureValue from '@values/StructureValue';
    import TextValue from '@values/TextValue';
    import type Value from '@values/Value';
    import { onDestroy, untrack } from 'svelte';

    interface Props {
        project: Project;
        evaluator: Evaluator;
        value: Value | undefined;
        /** The source whose value this is showing. Without it a stage cannot
         * recover evaluations that happened and were overwritten inside a single
         * frame, so a @Music.replay raised by one of them is never delivered.
         * Hosts must pass the same source they read `value` from. */
        source?: Source;
        editable: boolean;
        /** Whether output can be selected (for inspection or palette editing). Defaults to
         * editable; ProjectView passes it separately so debug mode can select without editing. */
        selectable?: boolean;
        fit?: boolean;
        grid?: boolean;
        painting?: boolean;
        paintingConfig?: PaintingConfiguration | undefined;
        mini?: boolean;
        /** Whether this surface may make sound. The main project stage and the
         *  tutorial do; docs examples and previews stay silent until the viewer
         *  presses their own play control, so opening a page of examples never
         *  starts a chorus. */
        sound?: boolean;
        /** Show a large pause glyph over the stage while not playing. Only the main
         *  project stage sets this; previews and the tutorial keep it off. */
        pauseOverlay?: boolean;
        background?: Color | string | null;
        /** Whether to process mouse wheel events without the shift key. Useful to disable for examples embedded in scrollable pages. */
        wheel?: boolean;
        /** Reflects whether the current stage value has an explicit place set. */
        hasStagePlace?: boolean;
        /** Reflects whether the audience has panned or zoomed away from the base focus. */
        focusAdjusted?: boolean;
        /** The audience's zoom, as a ratio of the base camera's scale; 1 is the base. */
        zoom?: number;
        /** Whether to blur the output while the user is typing in the project's editor. True for the main stage; false for embedded examples that are unaffected by the user's typing. */
        blurOnTyping?: boolean;
        /** Called when the viewer clicks Retry after a PermissionException. The host should restart the evaluator so failed streams can re-attempt getUserMedia. */
        onretry?: () => void;
        /** Content warnings the viewer must acknowledge before the project plays
         *  (moderation, photosensitivity). Empty for previews and the tutorial. */
        warnings?: GateWarning[];
        /** Reasons the content is blocked entirely (moderation blocks). */
        blocks?: GateBlock[];
        /** Called when the viewer acknowledges the content warnings via the gate. */
        onacknowledge?: () => void;
    }

    let {
        project,
        evaluator,
        value,
        source = undefined,
        editable,
        selectable = editable,
        fit = $bindable(true),
        grid = $bindable(false),
        painting = $bindable(false),
        paintingConfig = undefined,
        mini = false,
        sound = true,
        pauseOverlay = false,
        background = $bindable(null),
        wheel = true,
        hasStagePlace = $bindable(false),
        focusAdjusted = $bindable(false),
        zoom = $bindable(1),
        blurOnTyping = true,
        onretry = undefined,
        warnings = [],
        blocks = [],
        onacknowledge = undefined,
    }: Props = $props();

    /** Whether the audience's own pan or zoom has left nothing on the stage, reported by
     *  StageView. Local rather than a prop: the way back belongs beside the stage, not in
     *  the toolbar. */
    let contentHidden = $state(false);

    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);

    const evaluation = getEvaluation();
    const keyboardEditIdle = getKeyboardEditIdle();
    const selection = getSelectedOutput();
    const announce = getAnnouncer();
    const revealPalette = getRevealPalette();
    const paletteOpen = getPaletteOpen();

    /** Selecting output, and all the chrome that explains a selection, belong to the palette:
     *  with it closed the stage renders clean and nothing on it is selectable. Double-click and
     *  Enter are the exceptions — they open the palette, so they stay on `selectable`. */
    let inspecting = $derived(selectable && ($paletteOpen ?? false));

    // Instantiate the sensor panel stack coordinator for this OutputView instance
    const sensorPanelStack = new SensorPanelStack();
    setSensorPanelStack(sensorPanelStack);

    let ignored = $state(false);
    let valueView = $state<HTMLElement | undefined>();

    // The continuous rotate/size handle drag is owned HERE, on the stable stage view — not in the
    // per-output handle component, which re-mounts on every Projects.revise() (GroupView keys by
    // creator id) and would gap its listeners mid-drag. Gated on the steady `dragging` flag so it
    // attaches once per gesture; on each move it re-resolves the dragged output from the live
    // selection (robust to re-mount) and pivots on the center captured at gesture start.
    $effect(() => {
        if (!selection?.dragging) return;

        // Coalesce pointermove to at most one revise per animation frame, always applying the LATEST
        // pointer position. A handle drag's revise drives the whole edit pipeline (evaluator + Editor
        // + Palette), so processing every raw pointermove (often faster than the frame rate) backs up
        // the main thread. rAF keeps the stage frame-synced (unlike a debounce timer, which would lag
        // the pointer). Modeled on Evaluator.later()'s rAF use.
        let pendingMove: PointerEvent | undefined;
        let frame: number | undefined;

        function schedule(event: PointerEvent) {
            pendingMove = event;
            if (frame !== undefined) return;
            frame = requestAnimationFrame(() => {
                frame = undefined;
                const event = pendingMove;
                pendingMove = undefined;
                if (event) applyMove(event);
            });
        }

        function applyMove(event: PointerEvent) {
            // Re-resolve the dragged output from the live selection each frame (robust to the view
            // re-mounting), and use the gesture's CAPTURED center — never re-query the DOM element,
            // whose data-node-id lags $project by one evaluation and would freeze the gesture.
            const output = selection?.getOutput(project)[0];
            if (output === undefined) return;
            const context = project.getNodeContext(output);

            const rotating = selection?.rotationDragging;
            const sizing = selection?.sizeDragging;
            if (rotating) {
                const angle =
                    Math.atan2(
                        event.clientY - rotating.cy,
                        event.clientX - rotating.cx,
                    ) *
                    (180 / Math.PI);
                const next = rotatedOutput(
                    project,
                    output,
                    context,
                    rotating.startDegrees + (angle - rotating.startAngle),
                );
                // Skip a revise that wouldn't change the output's VALUE. rotatedOutput rounds to
                // whole degrees but always mints new node ids, so an unchanged frame produces a
                // structurally-equal project. Project.equals() (used by ProjectView to decide
                // whether to rebuild the evaluator) would then skip the rebuild, leaving the
                // rendered value's node ids stale relative to $project — which makes the on-stage
                // output unclickable and the handle vanish (it can't match the selection). Moving
                // never hits this because its position changes every frame.
                if (next && !next.isEqualTo(output))
                    Projects.revise(project, [[output, next]]);
            } else if (sizing && sizing.startDistance !== 0) {
                const distance = Math.hypot(
                    event.clientY - sizing.cy,
                    event.clientX - sizing.cx,
                );
                const next = resizedOutput(
                    project,
                    output,
                    context,
                    distance / sizing.startDistance,
                    sizing.startSize,
                );
                // Same no-op guard as rotation above: only revise (and advance the incremental
                // reference distance) when the value actually changes, or the stale-id desync
                // leaves the output stuck.
                if (next && !next.isEqualTo(output)) {
                    Projects.revise(project, [[output, next]]);
                    // A Shape scales its form per frame, so advance the reference distance;
                    // Phrase/Group resize absolutely from the fixed start distance.
                    if (resizeIsIncremental(project, output, context))
                        selection?.advanceSizing(distance);
                }
            }
        }

        // The gesture END (pointerup/pointercancel) is owned by OutputHandles, which registers it
        // synchronously on pointerdown so a quick release can't beat an async effect. This effect
        // owns only the continuous MOVE; its cleanup removes the listener when `dragging` clears.
        window.addEventListener('pointermove', schedule);
        return () => {
            window.removeEventListener('pointermove', schedule);
            if (frame !== undefined) cancelAnimationFrame(frame);
            pendingMove = undefined;
        };
    });

    /** The state of dragging the adjusted focus. A location or nothing. */
    let drag = $state<
        | {
              startPlace: Place;
              /** The audience's pan/zoom when the drag began, so a pan can anchor on it. */
              startOffset: { x: number; y: number; zoom: number } | undefined;
              left: number;
              top: number;
          }
        | undefined
    >();

    /** Whether this press has travelled far enough to be a move rather than a click.
     *  Latched for the gesture: re-testing every event would stall the move whenever
     *  the pointer wandered back near where it started. See moveThreshold.ts for why
     *  a click without this commits a real edit. */
    let movingOutput = $state(false);

    // Coalesce body-move revises to one per animation frame (like the handle drag above). Each move
    // revise drives the whole edit pipeline, so applying every raw pointermove backs up the main
    // thread. We store the latest target place and flush it once per frame; on release we flush
    // synchronously so the final position is never dropped. Only the MOVE path is throttled — pan,
    // pinch, painting, and Pointer-stream updates stay synchronous (handled in handlePointerMove).
    let pendingMoveTarget: { x: number; y: number } | undefined;
    let moveFrame: number | undefined;

    function scheduleMove(x: number, y: number) {
        pendingMoveTarget = { x, y };
        if (moveFrame !== undefined) return;
        moveFrame = requestAnimationFrame(() => {
            moveFrame = undefined;
            flushMove();
        });
    }

    function flushMove() {
        const target = pendingMoveTarget;
        pendingMoveTarget = undefined;
        if (target === undefined) return;
        const outputs = selection?.getOutput(project) ?? [];
        if (outputs.length === 0) return;
        moveOutput(DB, project, outputs, $locales, target.x, target.y, false);
    }

    function cancelScheduledMove() {
        if (moveFrame !== undefined) cancelAnimationFrame(moveFrame);
        moveFrame = undefined;
        pendingMoveTarget = undefined;
    }

    /** A list of points gathered during a painting drag */
    let paintingPlaces = $state<{ x: number; y: number }[]>([]);
    let strokeNodeID = $state<number | undefined>();

    /* We get these functions from the stage view, if there is one. */
    let stage = $state<ReturnType<typeof StageView> | undefined>();

    // The place the output is focusing on. Bound to the stage's focus, unless set here.
    // svelte-ignore state_referenced_locally
    let renderedFocus = $state<Place>(createPlace(evaluator, 0, 0, -12));

    /** A map from key string IDs to whether they are up or down */
    const keysDown: Map<string, boolean> = new Map();

    /** Event cache for touch panning and zooming */
    let pointersByIndex = $state<PointerEvent[]>([]);
    /** Whether the in-progress gesture is panning the camera, so it must not also feed
     *  the Pointer stream. */
    let panningCamera = $state(false);
    let startDifference = $state<number | undefined>();
    let startMidpoint = $state<{ x: number; y: number } | undefined>();
    let startGestureOffset = $state<
        { x: number; y: number; zoom: number } | undefined
    >();

    let keyboardInputView = $state<HTMLInputElement | undefined>();
    let chatInputView = $state<HTMLInputElement | undefined>();
    let chatText = $state('');

    const interactive = $derived(!mini);
    const exception = $derived(
        value instanceof ExceptionValue ? value : undefined,
    );
    const permissionException = $derived(
        exception instanceof PermissionException ? exception : undefined,
    );

    /** Browser permissions the project references but for which the user hasn't yet made a decision. */
    const pendingPermissions = $derived(
        new Set<PermissionName>(
            [...project.getRequiredPermissions()].filter(
                (p) => $consent[p] === 'unknown',
            ),
        ),
    );

    /** Permission reasons as gate warnings, in the same stable order as the splash. */
    const permissionWarnings = $derived(
        [...pendingPermissions].map<GateWarning>((permission) => ({
            kind: 'permission',
            permission,
        })),
    );

    /** All reasons the gate shows: pending permissions plus content warnings. */
    const gateWarnings = $derived([...permissionWarnings, ...warnings]);

    /** Show the pre-evaluation gate only before the evaluator has started —
     *  afterwards, permission denial flows through the exception branch, and
     *  content warnings have already been acknowledged. */
    const needsGate = $derived(
        !evaluator.isStarted() &&
            (gateWarnings.length > 0 || blocks.length > 0),
    );

    /** The camera models still downloading, with a label for the gate. Each
     *  status only loads when the project actually uses that stream, so this is
     *  implicitly scoped to the running project. */
    const loadingModels = $derived(
        [
            {
                loading: handLandmarkerStatus.loading,
                progress: handLandmarkerStatus.progress,
                label: (l: LocaleText) => l.ui.output.download.hand,
            },
            {
                loading: faceLandmarkerStatus.loading,
                progress: faceLandmarkerStatus.progress,
                label: (l: LocaleText) => l.ui.output.download.face,
            },
            {
                loading: objectDetectorStatus.loading,
                progress: objectDetectorStatus.progress,
                label: (l: LocaleText) => l.ui.output.download.objects,
            },
        ].filter((m) => m.loading),
    );

    /** Start downloading any camera model this project uses as soon as it's
     *  opened, so the multi-MB download overlaps the camera-permission prompt
     *  instead of only starting after the viewer grants it. The model download
     *  needs no camera permission; the camera itself starts later, on consent.
     *  Skipped for mini previews, which don't show the download gate. */
    $effect(() => {
        if (mini || typeof window === 'undefined') return;
        const input = project.shares.input;
        if (project.getReferences(input.Hand).length > 0) prefetchHand();
        if (project.getReferences(input.Face).length > 0) prefetchFace();
        if (project.getReferences(input.Objects).length > 0) prefetchObjects();
    });

    /** Start fetching the recordings this project's instruments need as soon as
     *  it opens. The player now waits for them rather than synthesizing a
     *  placeholder, so this is what keeps the wait short: the bytes arrive
     *  while the creator is reading, instead of after they press play. Fetching
     *  needs no AudioContext — decoding does, and happens once play makes one. */
    $effect(() => {
        if (mini || typeof window === 'undefined') return;
        for (const instrument of referencedInstruments(project))
            samples.request(instrument);
    });

    /** The chip's label: which instruments we're waiting on, or which fell back
     *  to synthesis because their recordings wouldn't load. Undefined when
     *  there's nothing to say — no music, or everything ready. Named with each
     *  instrument's own localized name rather than its internal key. */
    let musicLoadingLabel = $derived.by(() => {
        if (musics.length === 0) return undefined;
        const binds = instrumentBinds(project);
        const naming = (ids: string[]) =>
            ids
                .map(toInstrumentKey)
                .map((key) => (key === undefined ? undefined : binds.get(key)))
                .filter((bind) => bind !== undefined)
                .map((bind) => $locales.getName(bind.names))
                .join(', ');
        const loading = instrumentSamplesStatus.loading;
        if (loading.length > 0)
            return $locales
                .concretize((l) => l.ui.output.sound.loading, {
                    instruments: naming(loading),
                })
                .toText();
        const failed = instrumentSamplesStatus.failed;
        if (failed.length > 0)
            return $locales
                .concretize((l) => l.ui.output.sound.synthesized, {
                    instruments: naming(failed),
                })
                .toText();
        return undefined;
    });

    /** Top up from what is actually on stage. An instrument built from computed
     *  text (`🔈(name)`) names nothing in the source, so the reference scan
     *  can't see it; the evaluated tracks can. Requesting is idempotent. */
    $effect(() => {
        if (mini || typeof window === 'undefined') return;
        for (const music of musics)
            for (const instrument of musicInstruments(music))
                samples.request(instrument);
    });

    /** Localized "Loading X…" chip label for a model, used in mini mode where
     *  the download gate is suppressed and the corner chip is the only cue. */
    function modelLoadingLabel(model: (l: LocaleText) => string): string {
        return (
            $locales
                .concretize((l) => l.ui.output.download.loading, {
                    model: $locales.getUnannotatedPrimaryText(model),
                })
                ?.toText() ?? ''
        );
    }

    /** Announce a model download starting through the centralized Announcer
     *  (the status chips previously sat in a local aria-live region — see
     *  CLAUDE.md). Say text is deliberately NOT announced: it is already
     *  spoken aloud via speech synthesis; sensor meters change continuously
     *  and have focus-time labels instead. */
    const announcedModels = new Set<string>();
    $effect(() => {
        const models: [string, boolean, (l: LocaleText) => string][] = [
            [
                'hand',
                handLandmarkerStatus.loading,
                (l) => l.ui.output.download.hand,
            ],
            [
                'face',
                faceLandmarkerStatus.loading,
                (l) => l.ui.output.download.face,
            ],
            [
                'objects',
                objectDetectorStatus.loading,
                (l) => l.ui.output.download.objects,
            ],
        ];
        for (const [model, loading, label] of models) {
            if (!loading) {
                announcedModels.delete(model);
                continue;
            }
            if (announcedModels.has(model)) continue;
            announcedModels.add(model);
            if (announce && $announce)
                $announce(
                    'model-loading',
                    $locales.getLanguages()[0],
                    modelLoadingLabel(label),
                );
        }
    });

    /** After Start, keep the gate up as a download screen until every required
     *  camera model is ready, so the project isn't shown mid-download. A model
     *  only loads once evaluation has started, and the `needsGate` branch takes
     *  precedence in the render, so no explicit "started" check is needed. */
    const downloading = $derived(
        !mini && loadingModels.length > 0
            ? {
                  models: loadingModels.map((m) => m.label),
                  // Aggregate progress: average the known fractions, treating an
                  // as-yet-unknown total as 0 so the bar still advances.
                  progress: loadingModels.some((m) => m.progress === undefined)
                      ? undefined
                      : loadingModels.reduce(
                            (sum, m) => sum + (m.progress ?? 0),
                            0,
                        ) / loadingModels.length,
              }
            : undefined,
    );

    function handleStart() {
        for (const permission of pendingPermissions) grantConsent(permission);
        onacknowledge?.();
    }

    function handleRetry() {
        if (permissionException !== undefined)
            grantConsent(permissionException.permission);
        onretry?.();
    }

    /** Every time the value changes, try to parse a Stage from it. */
    const stageValue = $derived(
        value === undefined ? undefined : toStage(evaluator, value),
    );

    export function adjustZoom(steps: number) {
        stage?.zoomSteps(steps);
    }

    export function resetZoom() {
        stage?.resetFocus();
    }

    /** Every time the stage value changes, load any new fonts we might need */
    $effect(() => {
        if (stageValue) {
            const faces = stageValue.gatherFaces(new Set());
            untrack(() => {
                faces.forEach((face) => {
                    // Make sure this font is loaded. This is a little late -- we could do some static analysis
                    // and try to determine this in advance -- but anything can compute a font name. Maybe an optimization later.
                    if (face) Fonts.loadFace(face);
                });
            });
        }
    });

    /** Keep track of whether the creator is typing, so we can blur output until the next change. */
    const typing = $derived(
        blurOnTyping &&
            !mini &&
            $evaluation?.playing === true &&
            $keyboardEditIdle === IdleKind.Typing,
    );

    /** Keep the bindable background color up to date. */
    $effect(() => {
        background =
            value instanceof ExceptionValue
                ? 'var(--wordplay-error)'
                : (stageValue?.background ?? null);
    });

    /** Keep the bindable hasStagePlace flag up to date. */
    $effect(() => {
        hasStagePlace = stageValue?.place !== undefined;
    });

    /** A monochrome glyph color that contrasts with the output background so the
     *  pause watermark stays legible: black on a light stage, white on a dark one.
     *  Non-stage values render on the (light-pinned) theme background, so their
     *  contrast is just the theme foreground. */
    const pauseColor = $derived(
        background instanceof Color
            ? background.lightness.greaterThan(0.5)
                ? 'black'
                : 'white'
            : 'var(--wordplay-foreground)',
    );

    /** Keep track of streams that listen for keyboard input */
    const keys = $derived(
        $evaluation !== undefined &&
            $evaluation.evaluator.getBasisStreamsOfType(Key).length > 0,
    );
    const placements = $derived(
        $evaluation !== undefined &&
            $evaluation.evaluator.getBasisStreamsOfType(Placement).length > 0,
    );
    const chats = $derived(
        $evaluation !== undefined &&
            $evaluation.evaluator.getBasisStreamsOfType(Chat).length > 0,
    );

    /**
     * Whether this project's code asks for keyboard input at all, read from the
     * source rather than from streams the evaluator has created. The stage needs a
     * focus target from the moment it's on screen: a program whose `Key()` hasn't
     * evaluated yet has no stream, and without the sink below a keystroke lands in
     * the editor and edits the source instead (#1285). Only the sink uses this —
     * the on-screen keyboard and key pad still follow the live streams, so what a
     * touch device offers stays tied to what's actually listening.
     */
    const listensForKeys = $derived(
        evaluator.project.getReferences(evaluator.project.shares.input.Key)
            .length > 0 ||
            evaluator.project.getReferences(
                evaluator.project.shares.input.Placement,
            ).length > 0,
    );

    /**
     * Which keys this project listens for, when we're on a touch screen and
     * could offer them as buttons instead of the on-screen keyboard. Analysis
     * is cached per project revision, so this costs nothing to re-derive.
     */
    const keyAnalysis = $derived(
        TouchSupported && interactive && (keys || placements)
            ? analyzeProjectKeys(evaluator.project)
            : undefined,
    );
    /** The pad to show, if any. A project we couldn't fully bound still gets one
     *  for the keys it provably compares against — those are the keys it's
     *  played with — and keeps the keyboard for the rest. */
    const keyPad = $derived(
        keyAnalysis === undefined
            ? undefined
            : keyAnalysis.kind !== 'unbounded'
              ? keyAnalysis
              : keyAnalysis.keys.size > 0
                ? ({ kind: 'specific', keys: keyAnalysis.keys } as const)
                : undefined,
    );

    /** Only a project whose keys we bounded completely can have the on-screen
     *  keyboard taken away; anything else would strand the keys we can't see. */
    const keyboardSuppressed = $derived(
        keyAnalysis !== undefined && keyAnalysis.kind !== 'unbounded',
    );

    /** Interactive stage inputs (like the chat field) are only live in play mode;
     *  both edit and debug map to playing === false. */
    const playing = $derived($evaluation?.playing === true);
    /** Stepping through a paused program: each step's output is news, so it's
     *  announced even though the program isn't running. */
    const stepping = $derived($evaluation?.mode === 'debug');

    /** Keep track of active sensor streams */
    const hasMicrophoneStream = $derived(
        $evaluation !== undefined &&
            ($evaluation.evaluator.getBasisStreamsOfType(Volume).length > 0 ||
                $evaluation.evaluator.getBasisStreamsOfType(Pitch).length > 0 ||
                $evaluation.evaluator.getBasisStreamsOfType(SpeechStream)
                    .length > 0),
    );

    const hasCameraStream = $derived(
        $evaluation !== undefined &&
            ($evaluation.evaluator.getBasisStreamsOfType(Camera).length > 0 ||
                $evaluation.evaluator.getBasisStreamsOfType(Hand).length > 0 ||
                $evaluation.evaluator.getBasisStreamsOfType(Face).length > 0 ||
                $evaluation.evaluator.getBasisStreamsOfType(Objects).length >
                    0),
    );

    /** The last summary spoken, and the value and property it came from, so
     *  the next announcement can describe what CHANGED rather than repeating
     *  a summary a screen reader would ignore (see describeChange.ts). */
    let lastSummary: string | undefined = undefined;
    let lastAnnouncedValue: Value | undefined = undefined;
    let lastAnnouncedProperty: string | undefined = undefined;
    /** When the output was last examined, to bound the work to once per
     *  interval whether or not anything was said. */
    let lastValueCheck: number | undefined = undefined;
    /** How often a running program is re-examined for something new to say.
     *  Matches StageView's StillDuration: about as fast as a description can
     *  be read. */
    const RefreshInterval = 1000;

    /** Describe the current output for a screen reader, or undefined when
     *  there's nothing to say. */
    function describeValue(): string | undefined {
        {
            if (value === undefined) return undefined;
            // The generic `Value.getDescription` for any structure value
            // just returns the term "structure" — useless for a screen
            // reader. Prefer:
            //   - the rich, localized description for known output types
            //     (Phrase/Group/Stage/Shape/Say),
            //   - the BCT color name for Color values,
            //   - the literal text for TextValue (saying the type name
            //     "text" is uninformative; speak what the program produced).
            const output = toOutput(evaluator, value, new NameGenerator());
            // A Say is spoken aloud by speech synthesis below; announcing its
            // text here too would deliver it twice, in two different voices.
            // Checked before the stage below, since a bare Say becomes a stage.
            if (output instanceof Say) return;
            // Anything that renders as a stage is described by StageView, which
            // says what entered, changed, and moved — richer than a summary,
            // and a diff of the value can't recover movement or animation.
            // Describing it here too would deliver it twice, for the same
            // reason as the Say above.
            if (stageValue !== undefined) return;
            const colorValue = output ? undefined : toColor(value);
            const body = exception
                ? `${exception.getExceptionDescription($locales).toText()}: ${exception.getExplanation($locales).toText()}`
                : output !== undefined
                  ? output.getDescription($locales)
                  : colorValue !== undefined
                    ? describeColorLocalized(
                          $locales,
                          colorValue.lightness.toNumber(),
                          colorValue.chroma.toNumber(),
                          colorValue.hue.toNumber(),
                      )
                    : // Scalars ARE their value: a number, boolean, or text
                      // says nothing useful as "number"/"boolean"/"text", so
                      // speak what the program produced (with its unit). A
                      // structure is named by its type, since its generic
                      // description is just the word "structure". Collections
                      // deliberately fall through to that generic description:
                      // reading a whole list aloud on every change would bury
                      // the creator, and their changes are announced by
                      // describeValueChange instead.
                      value instanceof TextValue ||
                        value instanceof NumberValue ||
                        value instanceof BoolValue ||
                        value instanceof NoneValue ||
                        value instanceof StructureValue
                      ? renderValueForSpeech($locales, value)
                      : concretize(
                            $locales,
                            $locales.getPrimaryPlainText(
                                value.getDescription(),
                            ),
                            {},
                        ).toText();
            // Prefix with the localized "output" term so the screen reader
            // user can tell stage-output announcements apart from editor
            // and chooser announcements.
            return `${$locales.getPrimaryPlainText((l) =>
                getConceptName(l, 'output'),
            )} ${body}`;
        }
    }

    /** Say what's new about the output.
     *
     *  When the summary itself changed — a new type, or a scalar whose value
     *  is its summary — say the summary. When it didn't, say the next thing
     *  inside the value that did ("eyesOpen true"), because a screen reader
     *  will not re-read a live region whose text is unchanged, so repeating
     *  "Face" is heard exactly once. When nothing changed, say nothing.
     *
     *  Throttled to once per interval whether or not anything is announced: a
     *  stream like `Time()` produces a new value every frame, and sixty
     *  descriptions a second is noise no one can follow. */
    function announceValue(force = false) {
        if (!$announce) return;
        const now = Date.now();
        // The interval is already rate-limited by its own period, so it forces
        // through. Throttling it too meant a tick landing a millisecond early
        // (timer drift is routine) was dropped.
        if (
            !force &&
            lastValueCheck !== undefined &&
            now - lastValueCheck < RefreshInterval
        )
            return;
        lastValueCheck = now;

        const summary = describeValue();
        if (summary === undefined) return;

        // A new summary is the news; the diff starts over from it.
        if (summary !== lastSummary) {
            lastSummary = summary;
            lastAnnouncedValue = value;
            lastAnnouncedProperty = undefined;
            $announce('value', $locales.getLanguages()[0], summary);
            return;
        }

        // Same summary: find the next difference inside, resuming after the
        // property announced last time so one constantly-moving property
        // (an Expression's `place`) can't hide all the others.
        if (lastAnnouncedValue === undefined || value === undefined) return;
        const change = describeValueChange(
            $locales,
            lastAnnouncedValue,
            value,
            lastAnnouncedProperty,
        );
        if (change === undefined) return;
        // The baseline advances only when something is actually said, so a
        // value drifting by less than a tenth accumulates until it crosses
        // one instead of being re-zeroed every second and never heard.
        lastAnnouncedValue = value;
        lastAnnouncedProperty = change.name;
        $announce('value', $locales.getLanguages()[0], change.description);
    }

    // Announce when the value changes, but only while the program is producing
    // output. In edit mode the stage is a static preview of code the creator is
    // reading with the caret announcements — describing it there talks over the
    // editor, and over the tutorial's dialogue (which mounts a paused project).
    $effect(() => {
        value;
        if (!(playing || stepping)) return;
        untrack(() => announceValue());
    });

    // Sample on an interval while playing. This can't be left to the effect
    // above: the value prop doesn't change identity on every evaluation, so a
    // program whose output is visibly changing would announce once and then go
    // silent forever. Silence now means nothing changed, not that nothing is
    // running.
    //
    // The interval is created ONCE and checks `playing` untracked. Reading
    // `playing` reactively here would rebuild the timer on every evaluation —
    // clearing it before it ever reached a second, which is exactly why the
    // repetition never happened.
    $effect(() => {
        const interval = setInterval(
            () => untrack(() => (playing ? announceValue(true) : undefined)),
            RefreshInterval,
        );
        return () => clearInterval(interval);
    });

    /** When creator's preferred animation factor changes, update evaluator */
    $effect(() => evaluator.updateTimeMultiplier($animationFactor));

    /** Keys the stage maps onto Placement's axes of change. */
    function isPlacementKey(key: string) {
        return key.startsWith('Arrow') || key === '-' || key === '=';
    }

    /**
     * Give a key press or release to the streams that want it. Both the
     * physical keyboard and the on-screen key pad route through here, so a
     * tapped key is indistinguishable from a typed one — including for the
     * input recording that replay depends on.
     */
    function pressKey(key: string, down: boolean) {
        keysDown.set(key, down);

        if (!evaluator.isPlaying()) return;

        evaluator.singletonReact(Key, (stream) => stream.react({ key, down }));

        // Only a press is announced and steers Placement, matching what a
        // physical keyboard does.
        if (!down) return;

        if ($announce) $announce('keyinput', $locales.getLanguages()[0], key);

        if (isPlacementKey(key))
            evaluator.singletonReact(Placement, (stream) =>
                stream.react({
                    x: keysDown.get('ArrowLeft')
                        ? -1
                        : keysDown.get('ArrowRight')
                          ? 1
                          : 0,
                    y: keysDown.get('ArrowUp')
                        ? 1
                        : keysDown.get('ArrowDown')
                          ? -1
                          : 0,
                    z: keysDown.get('-') ? 1 : keysDown.get('=') ? -1 : 0,
                }),
            );
    }

    /**
     * A window that loses focus mid-hold never delivers the key up, which
     * leaves the key latched and steers Placement the wrong way on the next
     * press. Route through pressKey rather than clearing the map, so a program
     * watching `Key(down: ⊥)` still sees the release; snapshot first, since
     * pressKey mutates keysDown.
     */
    function releaseHeldKeys() {
        for (const [key, down] of Array.from(keysDown))
            if (down) pressKey(key, false);
    }

    function handleKeyUp(event: KeyboardEvent) {
        // Tab is for keyboard navigation, but still stops being held.
        if (event.key === 'Tab') {
            keysDown.set(event.key, false);
            return;
        }

        // The keyboard input is just a focus sink for key events; discard anything typed into it.
        if (keyboardInputView) {
            keyboardInputView.value = '';
        }

        pressKey(event.key, false);
    }

    function handleKeyDown(event: KeyboardEvent) {
        keysDown.set(event.key, true);

        const command = event.metaKey || event.ctrlKey;
        const shift = event.shiftKey;
        const select =
            (event.key === 'Enter' || event.key === ' ') && !command && !shift;

        // Never handle tab; that's for keyboard navigation.
        if (event.key === 'Tab') return;

        // Adjust verse focus
        if (stage && !evaluator.isPlaying()) {
            const increment = 1;
            if (event.key === 'ArrowLeft') {
                event.stopPropagation();
                return stage.adjustFocus(1 * increment, 0);
            } else if (event.key === 'ArrowRight') {
                event.stopPropagation();
                return stage.adjustFocus(-1 * increment, 0);
            } else if (event.key === 'ArrowUp') {
                event.stopPropagation();
                return stage.adjustFocus(0, 1 * increment);
            } else if (event.key === 'ArrowDown') {
                event.stopPropagation();
                return stage.adjustFocus(0, -1 * increment);
            } else if (event.key === '+') {
                event.stopPropagation();
                return stage.zoomSteps(1);
            } else if (event.key === '_') {
                event.stopPropagation();
                return stage.zoomSteps(-1);
            }
        }

        // Find the nearest focusable
        if (
            event.altKey &&
            event.key.startsWith('Arrow') &&
            valueView &&
            document.activeElement?.classList.contains('output')
        ) {
            // Which way are we moving?
            const direction = {
                ArrowRight: [1, 0],
                ArrowLeft: [-1, 0],
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
            }[event.key];

            if (direction) {
                const focusRect =
                    document.activeElement.getBoundingClientRect();

                const focusCenter = DOMRectCenter(focusRect);

                const focusable = getMeasuredFocusableOutput(focusCenter)
                    // Exclude
                    .filter(
                        (focusable) =>
                            (focusable.view !== document.activeElement &&
                                direction[0] > 0 &&
                                focusRect.left < focusable.rect.left) ||
                            (direction[0] < 0 &&
                                focusRect.right > focusable.rect.right) ||
                            (direction[1] > 0 &&
                                focusRect.top < focusable.rect.top) ||
                            (direction[1] < 0 &&
                                focusRect.bottom > focusable.rect.bottom),
                    )
                    // Sort by distance to center
                    .sort((a, b) => a.distance - b.distance);

                const nearest = focusable[0];
                if (nearest && nearest.view instanceof HTMLElement) {
                    setKeyboardFocus(
                        nearest.view,
                        'Focusing nearest view in output.',
                    );
                    event.stopPropagation();
                    return;
                }
            }
        }

        // Keyboard multi-select of outputs (paused + selectable), a decoupled "toggle" model: moving
        // focus (Tab / Alt+Arrow) never changes the selection; Space toggles the focused output in or
        // out; Enter selects ONLY the focused output and opens the palette; Escape clears; Cmd/Ctrl+A
        // selects all. Never mutate the selection mid handle-drag (mirrors selectPointerOutput).
        // Space and Cmd/Ctrl+A additionally need the palette open, since they only make a selection;
        // Enter is the keyboard way in, so like double-click it works without it.
        if (
            !evaluator.isPlaying() &&
            selectable &&
            selection &&
            !selection.dragging
        ) {
            const lang = $locales.getLanguages()[0];

            // Escape clears the whole selection (works even when focus is on the stage container).
            if (event.key === 'Escape' && !command && !shift) {
                if (!selection.isEmpty()) {
                    selection.empty();
                    if ($announce)
                        $announce(
                            'selection',
                            lang,
                            $locales.getPrimaryPlainText(
                                (l) => l.ui.output.cleared,
                            ),
                        );
                    event.stopPropagation();
                    return;
                }
            }

            // Cmd/Ctrl+A selects every selectable output on stage.
            if (event.key === 'a' && command && !shift && inspecting) {
                const all = getFocusableOutput()
                    .map((el) =>
                        getOutputNodeFromID(getOutputNodeIDFromElement(el)),
                    )
                    .filter((e): e is Evaluate => e !== undefined);
                if (all.length > 0) {
                    selection.selectAll(project, all);
                    if ($announce)
                        $announce(
                            'selection',
                            lang,
                            $locales
                                .concretize((l) => l.ui.output.allSelected, {
                                    count: all.length,
                                })
                                .toText(),
                        );
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
            }

            const evaluate = getOutputNodeFromID(getOutputNodeIDFromFocus());
            if (evaluate !== undefined) {
                // Use the output's description (its aria-label) for recognizability — data-name is an
                // internal id. Read before any toggle so a group's "selected" name suffix isn't echoed.
                const name =
                    document.activeElement instanceof HTMLElement
                        ? (document.activeElement.getAttribute('aria-label') ??
                          '')
                        : '';

                // Space toggles the focused output's membership in the selection.
                if (event.key === ' ' && !command && !shift && inspecting) {
                    selection.toggle(project, evaluate);
                    const nowSelected = selection.includes(evaluate, project);
                    const count = selection.getOutput(project).length;
                    if ($announce)
                        $announce(
                            'selection',
                            lang,
                            nowSelected
                                ? $locales
                                      .concretize((l) => l.ui.output.selected, {
                                          name,
                                          count,
                                      })
                                      .toText()
                                : $locales
                                      .concretize(
                                          (l) => l.ui.output.deselected,
                                          { name, count },
                                      )
                                      .toText(),
                        );
                    // Suppress page scroll AND the role=button activation the leaf would otherwise fire.
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }

                // Enter selects only the focused output and opens the palette. (A sole-selected phrase
                // consumes Enter for text editing in PhraseView before it reaches here.)
                if (event.key === 'Enter' && !command && !shift) {
                    selection.setPaths(project, [evaluate], 'output');
                    selection.setPhrase(null);
                    revealPalette?.();
                    if ($announce)
                        $announce(
                            'selection',
                            lang,
                            $locales
                                .concretize((l) => l.ui.output.selectedOnly, {
                                    name,
                                })
                                .toText(),
                        );
                    event.stopPropagation();
                    return;
                }

                // Cmd/Ctrl+Backspace deletes the focused output.
                if (event.key === 'Backspace' && command) {
                    Projects.revise(project, [[evaluate, undefined]]);
                    event.stopPropagation();
                    return;
                }
            }
        }

        if (evaluator.isPlaying()) {
            // Was the target clicked on output with a name? Add it to choice streams.
            if (select && event.target instanceof HTMLElement) {
                recordSelection(event);
                event.stopPropagation();
            }
        }

        // If dragging the focus, stop
        if (drag) drag = undefined;
        movingOutput = false;

        // Finally, if the event was ignored by all of the above, pass it to streams.
        pressKey(event.key, true);

        // Placement steers with these, so don't let them scroll the page too.
        if (evaluator.isPlaying() && isPlacementKey(event.key))
            event.stopPropagation();

        /**
         * A playing stage has just fed this key to its streams, so the page must
         * not also act on it. `stopPropagation` above is enough to stop *our*
         * page-scroll handler, but not the browser's own: Space on a focused
         * `tabindex="0"` div still scrolls the nearest scrolling ancestor, which
         * on a page that scrolls means pressing Space at a @Key example paged
         * the document out from under it. Only the keys that would scroll, and
         * only while playing — a paused stage isn't consuming anything, and
         * Tab must always stay with the browser.
         */
        if (evaluator.isPlaying() && ScrollingKeys.has(event.key))
            event.preventDefault();
    }

    /** The keys a browser scrolls a document with, which a playing stage consumes
     *  instead. Space and the arrows are the ones a program actually reads; the
     *  paging keys are here because they scroll too and a stage that swallows
     *  Space but not Page Down is stranger than one that swallows both. */
    const ScrollingKeys = new Set([
        ' ',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'Home',
        'End',
    ]);

    function submitChat() {
        // Chat is a live input, so only accept messages while playing (not in edit/step).
        if (!evaluator.isPlaying()) return;

        // Get the message
        const message = chatText;

        // Reset the message
        chatText = '';

        // Pass the message to the chats
        evaluator.singletonReact(Chat, (stream) => stream.react(message));
    }

    function submitChatForm(event: SubmitEvent) {
        event.preventDefault();
        submitChat();
    }

    function handleWheel(event: WheelEvent) {
        if (stage && (wheel || event.shiftKey)) {
            // deltaMode matters: a mouse that reports lines rather than pixels sends ~3
            // per notch, which read as pixels was no zoom at all.
            stage.zoomWheel(event.deltaY, event.deltaMode);
            event.preventDefault();
        }
    }

    /**
     * When the pointer is pressed down:
     * 1) Focus on the keyboard input if there is any
     * 2) Record a button down event if there is a button stream
     * 3) Reset the selection if not playing
     * 4) Send a placement navigation event based on the position of the pointer if there is a placement stream
     * 5) Initiate an output drag
     * */
    function handlePointerDown(event: PointerEvent) {
        // Add event to pointer event cache for
        pointersByIndex.push(event);

        // A second pointer turns this into a pinch gesture, so abandon any in-progress pan.
        if (pointersByIndex.length >= 2) {
            drag = undefined;
            movingOutput = false;
        }

        // Focus the keyboard sink if it exists, otherwise the chat field.
        const inputView = keyboardInputView ?? chatInputView;
        if (inputView) {
            setKeyboardFocus(
                inputView,
                'Focusing output text field on pointer down.',
            );
            event.stopPropagation();
            event.preventDefault();
        } else if (valueView) {
            setKeyboardFocus(valueView, 'Focusing on stage');
        }

        // If the evaluator is playing, record button events.
        if (evaluator.isPlaying()) {
            // Report where the tap landed before the button fires, so a touch
            // tap (which may send no pointer move) still carries its position.
            reactPointerStream(event);
            evaluator.singletonReact(Button, (stream) => stream.react(true));

            // Was the target clicked on output with a name? Add it to choice streams.
            if (event.target instanceof HTMLElement) {
                const output = event.target.closest('.output');
                if (output instanceof HTMLElement) recordSelection(event);
            }
        }
        // If we're selectable and not playing, select output.
        else if (inspecting) {
            if (painting) {
                if (selection) selection.setPaths(project, [], 'output');
            } else if (!selectPointerOutput(event)) {
                ignore();
            }
        }

        // If there's a Placement, send it some navigation events based on position.
        // Only while playing — Placement is a live input, so clicking output to select it
        // in edit/debug mode must not also nudge its placement.
        if (evaluator.isPlaying() && valueView && stageValue) {
            evaluator.singletonReact(Placement, (placement) => {
                // First, find the output on stage that this placement is placing,
                // so we can find the position of the pointer relative to the output.
                const latest = placement.latest();
                const output =
                    stageValue.find(
                        (output) => output.place?.value === latest,
                    ) ??
                    (stageValue.place?.value === latest
                        ? stageValue
                        : undefined);
                // Couldn't find the output? Move to the next one.
                if (output === undefined) return;

                // Now find the view of the output.
                const outputView =
                    output === stageValue
                        ? valueView
                        : valueView?.querySelector(
                              `[data-id="${output.getHTMLID()}"]`,
                          );
                // Couldn't find the view? Move on to the next one.
                if (!outputView) return;

                const outputRect = outputView.getBoundingClientRect();
                const outputX = outputRect.left + outputRect.width / 2;
                const outputY = outputRect.top + outputRect.height / 2;
                const relativePointerX = event.clientX - outputX;
                const relativePointerY = event.clientY - outputY;
                const atan2 =
                    (Math.atan2(relativePointerY, relativePointerX) * 180) /
                    Math.PI;
                const angle =
                    relativePointerY < 0 ? Math.abs(atan2) : 360 - atan2;

                const threshold = 20;

                const xDirection =
                    angle < 90 - threshold || angle > 270 + threshold
                        ? 1
                        : angle > 90 + threshold && angle < 270 - threshold
                          ? -1
                          : 0;

                const yDirection =
                    angle > threshold && angle < 180 - threshold
                        ? 1
                        : angle > 180 + threshold && angle < 360 - threshold
                          ? -1
                          : 0;

                // Divide the 360 degrees into 45 degree segments
                // Send the navigation directions to all all of the placements.
                placement.react({
                    x: xDirection,
                    y: yDirection,
                    z: 0,
                });
            });
        }

        // If there's a focus, start dragging — but only when editable. Dragging to pan the
        // view (or move a selected output) is an editing affordance; read-only stages like
        // how-to previews shouldn't pan on drag.
        if (editable && valueView && renderedFocus) {
            const output = selection?.getOutput(project) ?? [];

            // Whether this drag will MOVE a selected output (a non-Stage output, while paused
            // and editable) versus PAN the focus. Mirrors the decision in handlePointerMove —
            // it must agree so the drag's start place matches the gesture. A selected Stage (or
            // empty/playing) pans, so its start place is the rendered focus, NOT the Stage's
            // own place; panning then only moves x/y and retains the focus's z.
            const selectedOutput = output[0];
            const movable =
                !evaluator.isPlaying() &&
                selectedOutput !== undefined &&
                !selectedOutput.is(
                    project.shares.output.Stage,
                    project.getNodeContext(selectedOutput),
                );

            // Start dragging.
            const rect = valueView.getBoundingClientRect();
            const dx = event.clientX - rect.left;
            const dy = event.clientY - rect.top;
            const { x: mx, y: my } = screenToStage(
                dx - rect.width / 2,
                dy - rect.height / 2,
                renderedFocus.x,
                renderedFocus.y,
                renderedFocus.z,
            );
            const place =
                // If painting, the start place is where the click was
                painting
                    ? new Place(renderedFocus.value, mx, my, 0)
                    : // If moving a selected output, start from its place.
                      movable
                      ? getOrCreatePlace(
                            project,
                            $locales,
                            selectedOutput,
                            evaluator.project.getNodeContext(selectedOutput),
                        )
                      : // Otherwise we're panning: start from the rendered focus.
                        renderedFocus;

            // While playing, a plain drag belongs to the program: it is how Pointer and
            // Placement receive input, and panning with it moves the stage under content
            // that is chasing the pointer. Shift opts into panning, mirroring shift+wheel
            // to zoom; two fingers pan on touch. Paused, a drag pans as it always has.
            const panning = !painting && !movable;
            // A gesture that drives the camera is the camera's alone: letting it also feed
            // Pointer moves the stage under content that is chasing the pointer, which is
            // what made panning run away in the first place. Only a gesture that actually
            // pans counts — a plain drag while playing is the program's, and must still
            // reach Pointer.
            panningCamera = panning && mayPan(event) && evaluator.isPlaying();
            if (place && !(panning && !mayPan(event))) {
                drag = {
                    startPlace: place,
                    // Panning adjusts the audience's offset, so anchor it here. A press
                    // that never becomes a drag leaves it untouched, which is why fitting
                    // is no longer switched off on every click.
                    startOffset: stage?.getOffset(),
                    left: dx,
                    top: dy,
                };
                // A fresh press is a click until it travels far enough to be a drag.
                movingOutput = false;
                // Mark an on-stage gesture in progress when this drag will MOVE an output (not a pan
                // or paint), so ProjectView can defer conflict/concept-index work until release.
                if (movable) selection?.setInteracting(true);
                // Reset the painting places
                paintingPlaces = [];
                strokeNodeID = undefined;
            }
        }
    }

    /**
     * When the pointer moves:
     * 1) If we're pinching, zoom in and out based on the change in distance between the two pointers.
     * 2) If we're panning, pan
     * 3) If there's a Pointer stream, send a new point
     */
    function handlePointerMove(event: PointerEvent) {
        // TOUCH PANNING AND ZOOMING

        // Find the last event we had for this pointer.
        const index = pointersByIndex.findIndex(
            (ev) => ev.pointerId === event.pointerId,
        );
        // Replace it with this new event
        if (index >= 0) pointersByIndex[index] = event;

        // If there are two pointers down, this is a pinch: zoom by their distance and pan
        // by their midpoint. Panning here rather than on a single-finger drag is what makes
        // the stage pannable on a touch screen at all — a one-finger drag is how Pointer
        // streams receive input, so panning with it would fight the program, and it is
        // gated on `editable` so an audience never gets it. This block runs before that
        // gate, so a two-finger gesture works for an audience too.
        if (pointersByIndex.length === 2) {
            // Find the Euclidean distance between the two pointers
            const currentPointerDifference = Math.hypot(
                pointersByIndex[0].clientX - pointersByIndex[1].clientX,
                pointersByIndex[0].clientY - pointersByIndex[1].clientY,
            );
            const currentMidpoint = {
                x:
                    (pointersByIndex[0].clientX + pointersByIndex[1].clientX) /
                    2,
                y:
                    (pointersByIndex[0].clientY + pointersByIndex[1].clientY) /
                    2,
            };
            // No anchor yet? Anchor the gesture on the current distance, midpoint, and the
            // audience's offset, so the whole gesture is measured from where it started.
            if (
                startDifference === undefined ||
                startMidpoint === undefined ||
                startGestureOffset === undefined
            ) {
                startDifference = currentPointerDifference;
                startMidpoint = currentMidpoint;
                startGestureOffset = stage?.getOffset() ?? {
                    x: 0,
                    y: 0,
                    zoom: 1,
                };
            } else if (stage) {
                // Spreading the fingers twice as far apart zooms twice as far in. This is
                // the same law the wheel and the buttons now follow, stated in the units
                // the gesture already has.
                const zoom =
                    startGestureOffset.zoom *
                    (currentPointerDifference / startDifference);
                const scale = rootScale(0, renderedFocus.z);
                // Screen pixels to metres at the current scale, and in the same sign
                // convention the mouse drag-pan uses: a larger focus x/y translates content
                // right/down, so content follows the fingers.
                const dx =
                    (currentMidpoint.x - startMidpoint.x) /
                    (PX_PER_METER * scale);
                const dy =
                    (currentMidpoint.y - startMidpoint.y) /
                    (PX_PER_METER * scale);
                if (!isNaN(zoom) && !isNaN(dx) && !isNaN(dy))
                    stage.setOffset(
                        startGestureOffset.x + dx,
                        startGestureOffset.y + dy,
                        zoom,
                    );
            }
        }

        // POINTER PANNING AND ZOOMING

        // Handle focus or output moves.. but NOT while a rotation/size handle drag is in
        // progress — the handle owns that gesture, and moving/panning here would revise the
        // project concurrently, breaking the selection path (and crashing on an empty one).
        if (
            pointersByIndex.length < 2 &&
            event.buttons === 1 &&
            drag &&
            renderedFocus &&
            !selection?.rotationDragging &&
            !selection?.sizeDragging
        ) {
            const valueRect = valueView?.getBoundingClientRect();
            if (valueRect !== undefined) {
                const mouseXDelta = event.clientX - valueRect.left - drag.left;
                const mouseYDelta = event.clientY - valueRect.top - drag.top;
                const { x: renderedDeltaX, y: renderedDeltaY } = pixelsToMeters(
                    mouseXDelta,
                    mouseYDelta,
                    drag.startPlace.z,
                    renderedFocus.z,
                );

                const newX = twoDigits(drag.startPlace.x + renderedDeltaX);
                const newY = twoDigits(drag.startPlace.y - renderedDeltaY);

                // If painting, gather points
                if (editable && painting && paintingConfig) {
                    // Is the new position a certain Euclidian distance from the most recent position? Add a point to the stroke.
                    const prior = paintingPlaces.at(-1);
                    if (
                        prior === undefined ||
                        Math.sqrt(
                            Math.pow(prior.x - newX, 2) +
                                Math.pow(prior.y - newY, 2),
                        ) > 0.5
                    ) {
                        // Add the point
                        paintingPlaces.push({ x: newX, y: newY });

                        const minX = twoDigits(
                            Math.min.apply(
                                null,
                                paintingPlaces.map((p) => p.x),
                            ),
                        );
                        const minY = twoDigits(
                            Math.min.apply(
                                null,
                                paintingPlaces.map((p) => p.y),
                            ),
                        );

                        // Create a stroke. represented as freeform group of phrases with explicit positions.
                        const group = toExpression(
                            `Group(Free() [${paintingPlaces
                                .map(
                                    (p) =>
                                        `Place(${twoDigits(
                                            p.x - minX,
                                        )}m ${twoDigits(p.y - minY)}m)`,
                                )
                                .join(
                                    ' ',
                                )}].translate(ƒ(place•Place) Phrase('a' place: place)) place: Place(${minX}m ${minY}m))`,
                        );

                        // Add the stroke to the project's verse
                        if (strokeNodeID === undefined) {
                            addStageContent(DB, project, group);
                        } else {
                            const node = project.getNodeByID(strokeNodeID);
                            if (node) Projects.revise(project, [[node, group]]);
                        }
                        strokeNodeID = group.id;
                    }
                }
                // If panning, move focus
                else {
                    // Decide: move a selected movable output, or pan the stage focus.
                    // A "movable" output is a non-Stage output selected while paused and
                    // editable. Everything else — an empty selection, a selected Stage, or
                    // play mode (read-only) — falls through to panning. This is what lets the
                    // audience click to SELECT the Stage and still drag to PAN it during a
                    // pause, and keeps panning (but not editing) available during play.
                    const outputs = selection?.getOutput(project) ?? [];
                    const selected = outputs[0];
                    const movable =
                        editable &&
                        !evaluator.isPlaying() &&
                        selected !== undefined &&
                        !selected.is(
                            project.shares.output.Stage,
                            project.getNodeContext(selected),
                        );
                    if (movable) {
                        // A press only becomes a move once it has travelled far enough;
                        // otherwise a click's incidental jitter revises the program. The
                        // deltas here are already the pixels travelled since pointerdown.
                        if (
                            movingOutput ||
                            exceedsMoveThreshold(
                                mouseXDelta,
                                mouseYDelta,
                                event.pointerType,
                            )
                        ) {
                            movingOutput = true;
                            // Show the grid, for clarity on positioning.
                            grid = true;
                            // Defer the revise to one-per-frame (flushed on release); the latest target
                            // wins. Resolves the outputs fresh at flush time (robust to re-mount).
                            scheduleMove(newX, newY);
                            event.stopPropagation();
                        }
                    } else if (stage && drag.startOffset && mayPan(event)) {
                        const scale = rootScale(0, renderedFocus.z);
                        // Scale down the mouse delta and offset by the drag starting point.
                        // This adjusts the audience's offset rather than the camera itself,
                        // so panning composes with a program that moves its own camera.
                        stage.setOffset(
                            renderedDeltaX / scale + drag.startOffset.x,
                            renderedDeltaY / scale + drag.startOffset.y,
                            drag.startOffset.zoom,
                        );
                        event.stopPropagation();
                    }
                }
            }
        }

        // A gesture that is driving the camera doesn't also drive the program.
        if (!panningCamera) reactPointerStream(event);
    }

    /** Whether this drag may pan the camera. While playing, a plain drag is the program's
     *  input (Pointer, Placement), so panning with it would fight the project; shift opts
     *  in, matching shift+wheel to zoom, and two fingers pan on touch. Consulted by both
     *  the pointer-down setup and the move handler, which must agree. */
    function mayPan(event: PointerEvent) {
        return !evaluator.isPlaying() || event.shiftKey;
    }

    /** Report the pointer's stage position to any Pointer stream. Called on both
     * move and down, so a touch tap (which may fire no move) still tells the
     * project where it landed. */
    function reactPointerStream(event: PointerEvent) {
        const pointerStreams = evaluator.getBasisStreamsOfType(Pointer);
        if (valueView && evaluator.isPlaying() && pointerStreams.length > 0) {
            const valueRect = valueView.getBoundingClientRect();
            if (valueRect !== undefined) {
                // Pointer position in pixels from the centre of the tile, then through the
                // renderer's own inverse transform. Doing this arithmetic by hand here is
                // what previously reported y off by twice the camera's y.
                const position = screenToStage(
                    event.clientX - valueRect.left - valueRect.width / 2,
                    event.clientY - valueRect.top - valueRect.height / 2,
                    renderedFocus?.x ?? 0,
                    renderedFocus?.y ?? 0,
                    renderedFocus?.z ?? 0,
                );

                evaluator.singletonReact(Pointer, (stream) =>
                    stream.react(position),
                );
            }
        }
    }

    function handlePointerUp(event: PointerEvent) {
        // Remove this event from the event cache.
        const index = pointersByIndex.findIndex(
            (ev) => ev.pointerId === event.pointerId,
        );
        if (index >= 0) pointersByIndex.splice(index, 1);
        // Rset the distance once the number of pointers is less than 2.
        if (pointersByIndex.length < 2) {
            cancelGesture();
        }

        // Apply the final pending move synchronously so release never drops the last frame, then
        // cancel any scheduled frame. Done before clearing `interacting` so the deferred conflict /
        // concept-index work (gated on it in ProjectView) flushes once against the final project.
        flushMove();
        cancelScheduledMove();

        drag = undefined;
        movingOutput = false;
        paintingPlaces = [];
        strokeNodeID = undefined;
        selection?.setInteracting(false);

        if (evaluator.isPlaying())
            evaluator.singletonReact(Button, (stream) => stream.react(false));
    }

    function cancelGesture() {
        panningCamera = false;
        startDifference = undefined;
        startMidpoint = undefined;
        startGestureOffset = undefined;
        pointersByIndex = [];
    }

    function handlePointerLeave() {
        cancelGesture();
    }

    /**
     * Given a pointer event, finds the nearest output under the mouse and adds it to the project selection
     * if so.
     */
    function selectPointerOutput(event: PointerEvent | MouseEvent): boolean {
        if (selection === undefined) return false;
        // Never change the selection while a handle drag is in progress — the drag depends on it.
        if (selection.dragging) return true;
        // If we found the node in the project, add it to the selection.
        const evaluate = getOutputNodeFromID(
            getOutputNodeIDUnderPointer(event),
        );
        if (evaluate) {
            // If the shift key is down
            let newSelection: Evaluate[];
            if (event.shiftKey) {
                const output = selection.getOutput(project);
                const index = output.indexOf(evaluate);
                // If it's in the set, remove it.
                if (index >= 0) {
                    newSelection = [
                        ...output.slice(0, index),
                        ...output.slice(index + 1),
                    ];
                } else {
                    newSelection = [...output, evaluate];
                }
            }
            // Otherise, set the selection to the selection.
            else newSelection = [evaluate];

            // Update the selection
            selection.setPaths(project, newSelection, 'output');
            // Erase the selected phrase.
            selection.setPhrase(null);

            // Focus it too, for keyboard output.
            const outputView = valueView?.querySelector(
                `[data-node-id="${evaluate.id}"`,
            );

            if (outputView instanceof HTMLElement)
                setKeyboardFocus(
                    outputView,
                    'Focusing output on output selection',
                );
        }
        // Nothing under the pointer: select the explicit Stage (so it's still editable in
        // the palette), or clear when the stage is implicit and has no node to select.
        else if (
            stageValue?.explicit &&
            stageValue.value.creator instanceof Evaluate
        )
            selection.setPaths(project, [stageValue.value.creator], 'output');
        else selection.setPaths(project, [], 'output');

        return true;
    }

    /** Double-click selects the output under the pointer and explicitly opens the palette for it.
     *  (A phrase consumes dblclick for text editing before this fires, so this applies to shapes,
     *  groups, and the stage.) Read-only during play. */
    function handleDoubleClick(event: MouseEvent) {
        if (evaluator.isPlaying() || !selectable) return;
        selectPointerOutput(event);
        revealPalette?.();
    }

    function pixelsToMeters(mx: number, my: number, z: number, focusZ: number) {
        const scale = rootScale(z, focusZ);
        return { x: mx / PX_PER_METER / scale, y: my / PX_PER_METER / scale };
    }

    function twoDigits(num: number): number {
        return Math.round(100 * num) / 100;
    }

    function getOutputNodeIDUnderPointer(
        event: PointerEvent | MouseEvent,
    ): number | undefined {
        // Find the nearest .output element and get its node-id data attribute.
        // Accept any Element here, not just HTMLElement: clicks landing on
        // inline SVG (e.g. a custom character glyph rendered by CharacterView)
        // return SVGElements, which still support .closest() and walk up to
        // the enclosing .phrase div correctly.
        const element = document.elementFromPoint(event.clientX, event.clientY);
        return getOutputNodeIDFromElement(element?.closest('.output') ?? null);
    }
    function recordSelection(event: Event) {
        if (stageValue === undefined) return;

        const target = event?.target as HTMLElement;
        // Was the target clicked on output with a name? Add it to choice streams.
        const name = target.dataset.name;
        const selectable = target.dataset.selectable === 'true';
        const selection =
            selectable && name
                ? name
                : stageValue.selectable
                  ? stageValue.getName()
                  : undefined;
        if (selection) {
            evaluator.singletonReact(Choice, (stream) =>
                stream.react(selection),
            );
            event.stopPropagation();
        }
    }

    function getFocusableOutput() {
        return valueView
            ? Array.from(valueView.querySelectorAll('.output[tabindex="0"'))
            : [];
    }

    function getMeasuredFocusableOutput(center: [number, number]) {
        return getFocusableOutput().map((focusable) => {
            const rect = focusable.getBoundingClientRect();
            const distance = DOMRectDistance(center, rect);
            return {
                view: focusable,
                rect,
                distance,
            };
        });
    }

    function getOutputNodeIDFromFocus(): number | undefined {
        const focus = document.activeElement;
        if (!(focus instanceof HTMLElement)) return undefined;
        return getOutputNodeIDFromElement(focus);
    }

    function getOutputNodeIDFromElement(
        element: Element | null,
    ): number | undefined {
        if (!(element instanceof HTMLElement)) return;
        const nodeIDString = element.dataset.nodeId;
        if (nodeIDString === undefined) return;
        const nodeID = parseInt(nodeIDString);
        if (isNaN(nodeID)) return;
        return nodeID;
    }

    function getOutputNodeFromID(
        nodeID: number | undefined,
    ): Evaluate | undefined {
        if (nodeID === undefined) return undefined;

        // Find the node with the corresponding id in the current project.
        const node = project.getNodeByID(nodeID);
        return node instanceof Evaluate ? node : undefined;
    }

    function ignore() {
        ignored = true;
        setTimeout(() => (ignored = false), $animationFactor * 100);
    }

    let priorFocusRect: DOMRect | undefined = undefined;

    // Keep track of the focus rect on the currently focused element so we
    // can track the nearest focused element after an update.
    $effect.pre(() => {
        const focus = document.activeElement;
        if (
            focus &&
            valueView &&
            (valueView === focus || valueView.contains(focus))
        )
            priorFocusRect = focus.getBoundingClientRect();
    });

    // After any update, set focus on the output nearest to the prior focus rect.
    $effect(() => {
        // Did the body get focus after the update? Focus on the nearest view in output.
        if (
            interactive &&
            document.activeElement === document.body &&
            priorFocusRect &&
            valueView
        ) {
            const focusable = getMeasuredFocusableOutput(
                DOMRectCenter(priorFocusRect),
            );
            // Pick the closest view to focus
            let output: HTMLElement | undefined = undefined;
            if (focusable.length > 0) {
                const candidate = focusable.sort(
                    (a, b) => a.distance - b.distance,
                )[0].view;
                if (candidate instanceof HTMLElement) output = candidate;
            }
            // A program that reads keys needs the sink focused, not the stage:
            // focusing the stage instead is what leaves the on-screen keyboard
            // down after a stray blur.
            if (keyboardInputView && (keys || placements))
                setKeyboardFocus(
                    keyboardInputView,
                    'Output lost focus, restoring the keyboard sink',
                );
            else if (output)
                setKeyboardFocus(
                    output,
                    'Output lost focus, focusing on the closest focusbale output on stage',
                );
            else if (valueView)
                setKeyboardFocus(
                    valueView,
                    'Output lost focus, focusing on value output',
                );
        }
    });

    // Collect all Say outputs from the stage each evaluation, ignoring blank
    // text so a conditional that evaluates to Say('') stays silent.
    let says = $derived(
        (stageValue?.getSays() ?? []).filter(
            (say) => say.text.text.trim().length > 0,
        ),
    );

    // Keep the bus in step with the viewer's chosen voice. It lives here
    // because the bus deliberately can't read settings itself — it's reachable
    // from the music player, which must not pull in the database.
    $effect(() => {
        speech.prefer($voice ?? undefined);
    });

    /** Text of the utterances we most recently started speaking, to avoid restarting them. */
    let lastSpoken = '';

    /** The performance that text was spoken for. A newly begun performance — the
     *  program restarted, or played again after an edit — speaks even when its text is
     *  identical; resuming a paused one, or returning from the debugger, does not. This
     *  lives beside the text rather than replacing it because both are needed: text alone
     *  misses a restart, and the performance alone misses a stream that changes what is
     *  said. */
    let lastSpokenPerformance: number | undefined = undefined;

    // Speak the queued Say outputs, but only when the text actually changes.
    // Programs driven by streams re-evaluate constantly, so restarting speech
    // on every evaluation would cancel each utterance before it finished.
    $effect(() => {
        const currentSays = says;

        // A new performance can land on identical text and the same evaluator, so the
        // performance is the only thing that changed; the evaluation store carries it.
        const performance = $evaluation?.performance;

        const signature = currentSays
            .map(
                (say) =>
                    `${say.text.language?.getBCP47() ?? ''}:${say.text.text}`,
            )
            .join('\n');

        // Speech is a live output, so only speak while playing; the initial (paused)
        // evaluation still populates says. Cancel anything mid-flight when paused and record
        // nothing — recording here is what would break a rewind, since a scrub fires many
        // replays while paused and only the state on resuming play should decide.
        // (Every other input here guards the same way.)
        if (!playing) {
            speech.cancel(SaySource);
            return;
        }

        // Same text, and still the same performance? Let whatever is speaking continue.
        if (signature === lastSpoken && performance === lastSpokenPerformance)
            return;
        lastSpoken = signature;
        lastSpokenPerformance = performance;

        // Nothing to say now, but don't interrupt what's still being spoken.
        // Resetting the signature means the same text can be spoken again later.
        if (currentSays.length === 0) return;

        const lang = $locales.getLanguages()[0];

        // The bus chains these itself and cancels what this source had
        // pending, which is what the hand-rolled `onend` chain here used to do
        // — except that it cancelled every other source's speech along with it.
        speech.speak(
            SaySource,
            currentSays.map((say) => ({
                source: SaySource,
                text: say.text.text,
                lang: say.text.language?.getBCP47() ?? lang,
                rate: 1,
                volume: 1,
                priority: 'flow' as const,
            })),
        );
    });

    // Collect the music on stage each evaluation, the way says are collected
    // above. Music is frozen while paused or stepping, so a stage being read
    // with the caret and echo announcements is never played over — and picks up
    // where it stopped when the stage plays again.
    let musics = $derived(
        (stageValue?.getMusic() ?? []).map((music) => music.toData()),
    );

    /** Tracks as well as musics, because the renderings disagree about what
     *  counts as present — see `musicFloorHeight`. */
    let musicTracks = $derived(
        musics.reduce((total, music) => total + music.tracks.length, 0),
    );

    /** How far above the stage floor the caption and key pad stand: clear of a
     *  rendering that must not be drawn over, flush with the floor otherwise. */
    let bandFloor = $derived(
        musicFloorHeight($musicVisualization, {
            musics: musics.length,
            tracks: musicTracks,
        }),
    );

    /** The performance the music was last reconciled for, so a new one restarts a
     *  piece that already played to its end. */
    let lastSoundedPerformance: number | undefined = undefined;

    /** Acquired lazily, so a stage with no music never builds an AudioContext. */
    let musicHandle: ReturnType<typeof acquireMusicPlayer> | undefined =
        undefined;
    /** The evaluator the handle was acquired for. Beats are delivered to *that*
     *  evaluator's streams, and previews swap in a fresh evaluator when the
     *  viewer presses play — so a handle held past that swap sends every beat to
     *  a discarded evaluator and @Beat never fires, while the sound plays on. */
    let musicEvaluator: Evaluator | undefined = undefined;

    /** The step this stage has already told the player about. Everything the
     *  evaluator recorded after it is an evaluation no frame ever showed. */
    let lastMusicStep: number | undefined = undefined;

    /** Whether this project ever writes a @Music.replay. Recovering missed
     *  evaluations costs a stage rebuild each, and only replay can need them. */
    let replays = $derived(
        source !== undefined && projectReplaysMusic(project),
    );

    /** The viewer's volume scales every music; muting is volume 0. */
    function scaleMusic(present: MusicData[]): MusicData[] {
        return present.map((music) => ({
            ...music,
            volume: music.volume * $musicVolume,
        }));
    }

    /**
     * Deliver the evaluations this stage never got to show.
     *
     * @Music.replay is true on exactly one evaluation, but a stage renders once
     * per frame and several evaluations can happen inside one — a @Collision or
     * @Beat is answered the instant it happens, and queued changes chain. The
     * flag would rise and fall between two frames and nothing would ever read
     * it, which is why a save that sounded in Football did not.
     *
     * Content needs no catching up: the newest snapshot is already right, and
     * replaying an older one would splice a stale edit over a current one. Only
     * the replays are delivered, and only ahead of the current snapshot.
     */
    function catchUpMusic(audible: boolean) {
        if (
            source === undefined ||
            musicHandle === undefined ||
            lastMusicStep === undefined ||
            evaluator.isInPast()
        )
            return;
        const missed = evaluator.getSourceValuesAfter(source, lastMusicStep);
        // The last is the one the current snapshot came from; it is delivered
        // below, in full, rather than here.
        const snapshots = missed.slice(0, -1).map((indexed) => ({
            stepNumber: indexed.stepNumber,
            musics:
                indexed.value === undefined
                    ? []
                    : (toStage(evaluator, indexed.value)
                          ?.getMusic()
                          .map((music) => music.toData()) ?? []),
        }));
        for (const replaying of missedReplays(snapshots))
            // Marked at the step it actually happened, so the editor's history
            // shows where the music was then. Never `beginning`: that is the
            // current snapshot's to report, and twice would restart it twice.
            musicHandle.player.update(
                scaleMusic(replaying.musics),
                audible,
                replaying.stepNumber,
                false,
            );
    }

    $effect(() => {
        // Re-run when the audio context resumes, so sound recovers on the
        // unlock gesture rather than on the next evaluation.
        $musicSuspended;
        const present = musics;
        // The music editor's preview takes over while it plays: both share one
        // audio context, and two transports at different positions sound like a
        // mistake. `update(…, false)` suspends rather than stops, so the stage
        // picks up where it was when the preview lets go.
        const audible = playing && sound && !$isPreviewing;
        // A mini preview shows an *unselected* source on the very same
        // evaluator as the stage, and the player registry is keyed by
        // evaluator — so a preview that drove it would be telling the stage's
        // own player to stop, over and over, about music it isn't showing.
        // Previews are never audible anyway; only the stage speaks for it.
        if (mini) return;
        if (musicHandle !== undefined && musicEvaluator !== evaluator) {
            musicHandle.release();
            musicHandle = undefined;
            musicEvaluator = undefined;
        }
        if (present.length === 0 && musicHandle === undefined) return;
        if (musicHandle === undefined) {
            musicHandle = acquireMusicPlayer(evaluator);
            musicEvaluator = evaluator;
            // No catching up on the first pass with a new player. An edit
            // replays every recorded input into a replacement evaluator, so a
            // stage that caught up from the start of that history would fire
            // every past replay at once; the cursor below starts it from here.
        } else if (replays && audible) untrack(() => catchUpMusic(audible));
        lastMusicStep = evaluator.getStepIndex();
        const scaled = scaleMusic(present);
        // The step index says where in its own history this evaluation sits, so
        // a creator stepping backwards can be shown where the music was then.
        // A new performance re-sounds a one-shot score, the way it re-speaks a
        // Say; resuming a paused one picks the piece up mid-phrase instead.
        const beginning = $evaluation?.performance !== lastSoundedPerformance;
        lastSoundedPerformance = $evaluation?.performance;
        musicHandle.player.update(
            scaled,
            audible,
            evaluator.getStepIndex(),
            beginning,
        );
    });

    $effect(() => {
        musicHandle?.player.setDucking($shouldDuckMusic, $musicDucking);
    });

    let needsSoundGesture = $derived(
        playing && sound && musics.length > 0 && $musicSuspended && !mini,
    );

    /** Names of the music we've already described, so a description — which
     * is constant text — is spoken once per entry rather than repeating
     * inaudibly on every evaluation. */
    let describedMusic = new Set<string>();

    // Describe music that can't be heard, so it is never silent in both
    // channels at once. Silence while it plays audibly: the sound is the
    // description.
    $effect(() => {
        const present = stageValue?.getMusic() ?? [];
        const inaudible = $musicVolume === 0 || audio.isSuspended();
        const names = new Set(present.map((music) => music.getName()));
        for (const name of describedMusic)
            if (!names.has(name)) describedMusic.delete(name);
        if (!playing || !inaudible || announce === undefined || !$announce)
            return;
        for (const music of present) {
            const name = music.getName();
            if (describedMusic.has(name)) continue;
            describedMusic.add(name);
            // A creator's description wins over the generated one, as it
            // does for every other output.
            const text =
                music.description?.text ?? music.getDescription($locales);
            if (text.length > 0)
                $announce(
                    'music-description',
                    $locales.getLanguages()[0],
                    text,
                );
        }
    });

    onDestroy(() => {
        // Only this view's says: a cancel that reached every source would
        // silence music still playing elsewhere on the page.
        speech.cancel(SaySource);
        musicHandle?.release();
        musicHandle = undefined;
        musicEvaluator = undefined;
    });
</script>

<!--
    iOS Safari keeps document.activeElement across a backgrounded tab (switching
    apps, locking the device) even though the on-screen keyboard is gone. On
    return, setKeyboardFocus's "already focused" short-circuit skips .focus(), so
    the keyboard never comes back until the creator taps something else first.
    Blurring on visibility change resets that so the next tap focuses cleanly.
    Same fix as the editor's textarea.
-->
<svelte:document
    onvisibilitychange={() => {
        if (
            document.hidden &&
            keyboardInputView &&
            document.activeElement === keyboardInputView
        )
            keyboardInputView.blur();
        // A key held while the page is hidden never sends its key up.
        if (document.hidden && interactive) releaseHeldKeys();
    }}
/>
<svelte:window onblur={interactive ? releaseHeldKeys : null} />

<section
    class="output"
    data-testid="output"
    data-uiid="stage"
    role="group"
    aria-label={$locales.getPrimaryPlainText((l) => l.ui.output.label)}
    aria-describedby={$evaluation?.playing === false && !painting && inspecting
        ? 'output-multiselect-help'
        : null}
    class:mini
    class:editing={$evaluation?.playing === false && !painting && inspecting}
    class:selected={stageValue &&
        stageValue.explicit &&
        stageValue.value.creator instanceof Evaluate &&
        selection !== undefined &&
        selection.includes(stageValue.value.creator, project)}
>
    {#if $evaluation?.playing === false && !painting && selectable}
        <span id="output-multiselect-help" class="multiselect-help"
            ><LocalizedText path={(l) => l.ui.output.multiselect} /></span
        >
    {/if}
    <!-- The stage is an input surface that forwards pointer/key events to the
         running program's stream inputs (Key, Pointer, Button), not a control
         with a matching ARIA role; it is keyboard-operable via its tabindex
         and key handlers, and described to screen readers by the live region
         and labels within. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="value"
        class:ignored
        class:typing
        tabIndex="0"
        bind:this={valueView}
        onkeydown={interactive ? handleKeyDown : null}
        onkeyup={interactive ? handleKeyUp : null}
        ondblclick={interactive ? handleDoubleClick : null}
        onwheel={interactive ? handleWheel : null}
        onpointerdown={(event) => {
            event.stopPropagation();
            if (interactive) handlePointerDown(event);
        }}
        onmousedown={(event) => {
            // iOS Safari fires a synthetic mousedown after touchend even though
            // we handled the gesture with pointer events, and that mousedown's
            // default action blurs the programmatically focused keyboard sink —
            // which is what dismisses the on-screen keyboard a moment after a
            // tap. preventDefault on pointerdown does not suppress it, so it has
            // to be cancelled here. Real mouse and pen input is already handled
            // by pointerdown, so in practice only touch reaches this. Same fix
            // as the editor's textarea.
            event.preventDefault();
        }}
        onpointerup={interactive ? handlePointerUp : null}
        onpointermove={interactive ? handlePointerMove : null}
        onpointerleave={interactive ? handlePointerLeave : null}
    >
        <!-- Block until permissions/warnings are acknowledged AND any camera
             model finishes downloading. The download runs in parallel with the
             permission prompt (see the prefetch effect), so its progress shows
             alongside the permission ask rather than only after Start. -->
        <!-- Evaluators start without a user gesture, so a stage that plays
             music on load usually finds the audio context suspended. The
             gesture latch resumes it on the next click or key anywhere in the
             app; this is the visible way out when no gesture comes. -->
        <!-- The audience's own pan or zoom can leave the stage looking empty, with nothing
             to say why. This says why, and offers the way back. It exists only while their
             adjustment is what is hiding things, and pressing it clears that adjustment —
             so it can never sit over content a viewer is unable to uncover. -->
        {#if needsSoundGesture || contentHidden}
            <div class="stage-overlays">
                {#if needsSoundGesture}
                    <ButtonWidget
                        tip={(l) => l.ui.output.sound.enable}
                        action={() => void audio.resume()}
                        ><LocalizedText
                            path={(l) => l.ui.output.sound.enable}
                        /></ButtonWidget
                    >
                {/if}
                {#if contentHidden}
                    <div class="content-hidden" data-uiid="stageContentHidden">
                        <Note center
                            ><LocalizedText
                                path={(l) => l.ui.output.hidden.message}
                            /></Note
                        >
                        <ButtonWidget
                            uiid="stageShowEverything"
                            background
                            tip={(l) => l.ui.output.hidden.show}
                            action={() => stage?.resetFocus()}
                            ><LocalizedText
                                path={(l) => l.ui.output.hidden.show}
                            /></ButtonWidget
                        >
                    </div>
                {/if}
            </div>
        {/if}
        {#if needsGate || downloading !== undefined}
            <StartGate
                warnings={needsGate ? gateWarnings : []}
                blocks={needsGate ? blocks : []}
                onstart={handleStart}
                {downloading}
            />
            <!-- If there's an exception, show that. -->
        {:else if exception !== undefined}
            <div class="message exception" class:mini data-uiid="exception"
                >{#if mini}!{:else}<h2
                        ><MarkupHTMLView
                            inline
                            markup={{
                                perLocale: (l) =>
                                    exception.getExceptionDescription(l),
                            }}
                        /></h2
                    ><Speech
                        eyes
                        character={index?.getNodeConcept(exception.creator) ??
                            exception.creator.getCharacter($locales)}
                        invert
                    >
                        {#snippet content()}
                            <MarkupHTMLView
                                markup={{
                                    perLocale: (l) =>
                                        exception.getExplanation(l),
                                }}
                            />
                            {#if permissionException !== undefined && onretry !== undefined}
                                <div class="permission-retry">
                                    <ButtonUI
                                        tip={(l) =>
                                            l.ui.output.permission.retry}
                                        action={handleRetry}
                                        background
                                        testid="permission-retry"
                                    >
                                        <LocalizedText
                                            path={(l) =>
                                                l.ui.output.permission.retry}
                                        />
                                    </ButtonUI>
                                </div>
                            {/if}
                        {/snippet}</Speech
                    >
                {/if}
            </div>
            <!-- If there's no verse -->
        {:else if value === undefined}
            <div class="message evaluating" class:mini>◆</div>
            <!-- If there's a value, but it's not a stage, show that -->
        {:else if stageValue === undefined}
            <div class="message" class:mini>
                {#if mini}
                    <ValueView {value} interactive={false} />
                {:else}
                    <h2><LocalizedText path={value.getDescription()} /></h2>
                    <ValueView {value} inline={false} />
                {/if}
            </div>
            <!-- Otherwise, show the Stage -->
        {:else}
            <StageView
                {project}
                {evaluator}
                stage={stageValue}
                background
                bind:fit
                bind:grid
                bind:painting
                bind:this={stage}
                bind:renderedFocus
                bind:focusAdjusted
                bind:zoom
                bind:contentHidden
                interactive={!mini}
                {mini}
                {editable}
                inspectable={inspecting}
            />
        {/if}
        <!-- Paused watermark: covers both stage and non-stage value output (e.g. a
             live Time() value that stops updating), so the pause is explained
             wherever output renders. Suppressed on the gate, exception, and
             pre-evaluation states, where a different message already shows. -->
        {#if pauseOverlay && !playing && !needsGate && downloading === undefined && exception === undefined && value !== undefined}
            <div
                class="pause-overlay"
                aria-hidden="true"
                style:color={pauseColor}
            >
                <span class="pause-glyph"><Emoji text={PAUSE_SYMBOL} /></span>
            </div>
        {/if}
        <!-- One band along the stage floor holding everything that has to stay
             clear of the music: the Say caption, and the touch key pad under it.
             Stacked in one column rather than positioned separately, because
             both are variable height — the pad by how many keys a project uses,
             the caption by the viewer's size setting — and no pair of hand-tuned
             offsets survives both. Spanning the full stage rather than hugging
             its contents is what gives it a definite height, which is what lets
             the caption be capped as a fraction of the stage instead of in em
             that grow with the setting.

             Not in a mini preview, whose .value is position:static — an
             absolutely positioned band there would escape to an unrelated
             ancestor. Previews share the one global speech source with the real
             stage, and a pad there was never tappable anyway. -->
        {#if !mini}
            <div class="stage-floor-band" style:--floor={bandFloor}>
                <Caption />
                {#if keyPad !== undefined}
                    <KeyPadView analysis={keyPad} press={pressKey} />
                {/if}
            </div>
        {/if}
        <!-- Stage controls dock: stream status chips (Hand/Face loading, sensors) + keyboard input -->
        {#if musicLoadingLabel !== undefined || handLandmarkerStatus.loading || faceLandmarkerStatus.loading || objectDetectorStatus.loading || hasMicrophoneStream || hasCameraStream || (interactive && listensForKeys)}
            <div class="stage-controls-dock">
                <!-- Corner status chips: Hand/Face loading indicators, sensor monitors -->
                {#if musicLoadingLabel !== undefined || handLandmarkerStatus.loading || faceLandmarkerStatus.loading || objectDetectorStatus.loading || hasMicrophoneStream || hasCameraStream}
                    <div class="stage-controls-row">
                        <!-- Sensor monitors (camera before microphone in visual order) -->
                        {#if hasCameraStream}
                            <SensorMonitor
                                kind="camera"
                                database={DB}
                                {evaluator}
                            />
                        {/if}
                        {#if hasMicrophoneStream}
                            <SensorMonitor
                                kind="microphone"
                                database={DB}
                                {evaluator}
                            />
                        {/if}
                        <!-- Why the music hasn't started yet. The player waits
                             for an instrument's recordings rather than
                             synthesizing a placeholder, so without this the
                             silence has no explanation. -->
                        {#if musicLoadingLabel !== undefined}
                            <span
                                class="stage-control-chip hand-loading"
                                title={musicLoadingLabel}
                                aria-label={musicLoadingLabel}
                                ><Emoji text="🔈" /></span
                            >
                        {/if}
                        <!-- Model loading indicators -->
                        {#if handLandmarkerStatus.loading}
                            {@const label = modelLoadingLabel(
                                (l) => l.ui.output.download.hand,
                            )}
                            <span
                                class="stage-control-chip hand-loading"
                                title={label}
                                aria-label={label}><Emoji text="🖐" /></span
                            >
                        {/if}
                        {#if faceLandmarkerStatus.loading}
                            {@const label = modelLoadingLabel(
                                (l) => l.ui.output.download.face,
                            )}
                            <span
                                class="stage-control-chip face-loading"
                                title={label}
                                aria-label={label}><Emoji text="🙂" /></span
                            >
                        {/if}
                        {#if objectDetectorStatus.loading}
                            {@const label = modelLoadingLabel(
                                (l) => l.ui.output.download.objects,
                            )}
                            <span
                                class="stage-control-chip object-loading"
                                title={label}
                                aria-label={label}><Emoji text="📦" /></span
                            >
                        {/if}
                    </div>
                {/if}
                <!-- Hidden focus sink that lets Key/Placement streams receive keyboard events -->
                {#if interactive && listensForKeys}
                    <div class="keyboard">
                        <!-- With every key on screen, the on-screen keyboard
                             would only obstruct the stage; the field stays
                             focused so physical keyboards still work. A project
                             we couldn't fully bound keeps the keyboard even when
                             it has a pad, since the pad can't offer every key. -->
                        <input
                            type="text"
                            class="keyboard-input"
                            data-defaultfocus
                            inputmode={keyboardSuppressed ? 'none' : undefined}
                            aria-autocomplete="none"
                            autocapitalize="none"
                            spellcheck="false"
                            aria-label={$locales.getPrimaryPlainText(
                                (l) => l.ui.output.field.key.description,
                            )}
                            autocomplete="off"
                            autocorrect="off"
                            bind:this={keyboardInputView}
                        />
                    </div>
                {/if}
            </div>
        {/if}
    </div>
    <!-- Chat stream message field. It lives OUTSIDE .value so it escapes the pinned
         light color-scheme and follows the app theme like other chrome, and takes
         real layout space below the stage rather than floating over creator output. -->
    {#if chats}
        <form
            class="chat-footer"
            data-indicates-focus
            onsubmit={submitChatForm}
        >
            <TextField
                id="stage-chat"
                fill
                defaultFocus
                editable={playing}
                bind:text={chatText}
                bind:view={chatInputView}
                placeholder={(l) => l.ui.output.field.chat.placeholder}
                description={(l) => l.ui.output.field.chat.description}
            />
            <ButtonUI
                submit
                background
                active={playing}
                tip={(l) => l.ui.output.button.submit}
                action={submitChat}>↑</ButtonUI
            >
        </form>
    {/if}
</section>

<style>
    /* Sits over the stage so it's reachable however the stage is laid out,
       and centred at the bottom so it doesn't cover the output. Stacked, since the
       sound latch and the off-stage hint can both be up at once. */
    .stage-overlays {
        position: absolute;
        bottom: var(--wordplay-spacing);
        left: 50%;
        transform: translateX(-50%);
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--wordplay-spacing);
    }

    .content-hidden {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: calc(var(--wordplay-spacing) / 2);
        padding: var(--wordplay-spacing);
        background: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        max-width: 20em;
    }

    .output {
        transform-origin: top right;

        display: flex;
        flex-direction: column;
        justify-items: stretch;
        align-items: stretch;
        position: relative;
        height: 100%;

        flex-grow: 1;
    }

    /* Visually-hidden screen-reader instructions for keyboard multi-select. */
    .multiselect-help {
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        height: 1px;
        width: 1px;
        overflow: hidden;
        position: absolute;
        /* Anchored so the box can't sit at a static position outside its
           scrolling pane and extend the document (see Announcer.svelte). */
        top: 0;
        left: 0;
        white-space: nowrap;
    }

    /* Focus and selection feedback wrap the creator canvas only, not the
       chat footer chrome that sits below it in the same section. */
    .value:focus-within {
        outline: var(--wordplay-focus-width) solid var(--wordplay-focus-color);
        outline-offset: calc(-1 * var(--wordplay-focus-width));
    }

    /* Unified on-stage selection feedback for Phrase / Shape / Group, shown only
       when paused (.editing) and interactive. `.editing` requires the palette to
       be open, so these are the palette's chrome: with it closed the stage renders
       clean. Centralized here so the three views can't drift apart.

       Drawn on an ::after overlay rather than on the element itself because the
       overlay sits above the content, so an opaque Shape fill can't paint over it,
       and because keyboard focus owns the element's own box-shadow (below) — the
       overlay keeps these rings off that property instead of fighting it.

       The two states use different properties on purpose: unselected wants dashes,
       which only `outline` can draw, and selected wants a blurred glow, which only
       box-shadow can. So the selected rule must clear the outline, or the dashes
       show through underneath it. The glow itself — rounded rect, travelling
       highlight, and its reduced-motion fallback — is defined once as
       `.selection-glow` in app.html and shared with the editor, which marks the
       selected output's name the same way. */
    :global(.stage.editing.interactive .phrase::after),
    :global(.stage.editing.interactive .shape::after),
    :global(.stage.editing.interactive .group:not(.root)::after) {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        border-radius: var(--selection-radius);
        outline: var(--selection-ring-width) dashed
            var(--wordplay-inactive-color);
    }

    :global(.stage.editing.interactive .phrase.selected::after),
    :global(.stage.editing.interactive .shape.selected::after),
    :global(.stage.editing.interactive .group.selected::after) {
        /* The ring is an outline rather than the first box-shadow so it can be
           dashed, matching the editor's outline; the glow stays a shadow. */
        outline: var(--selection-ring-width) dashed var(--selection-color);
        box-shadow: 0 0 var(--selection-glow-blur) 0 var(--selection-color);
        animation: selectionglow calc(var(--animation-factor) * 3s) ease-in-out
            infinite;
        will-change: box-shadow;
    }

    /* The explicit Stage has no box of its own on the canvas — it *is* the canvas — so
       it's marked as a frame around the whole output view. Drawn inward on an overlay:
       `.value` clips its overflow, so an outward ring and blur would be cut away
       entirely, and an inset shadow on `.value` itself would be painted over by the
       stage's own background (a child). The overlay sits above that content. */
    .output.editing.selected > .value::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        border-radius: var(--selection-radius);
        /* Drawn inward with a negative offset, since `.value` clips its
           overflow — an outline is what lets this dash like the rest. */
        outline: var(--selection-ring-width) dashed var(--selection-color);
        outline-offset: calc(-1 * var(--selection-ring-width));
        box-shadow: inset 0 0 var(--selection-glow-blur) 0
            var(--selection-color);
        animation: selectionglowinset calc(var(--animation-factor) * 3s)
            ease-in-out infinite;
        will-change: box-shadow;
    }

    /* A keyboard-focused output shows a SOLID focus ring drawn with box-shadow (a different property
       than the selection/selectable dashed `outline` above) so the two coexist — a focused AND
       selected output shows both. One ring, not two: it used to carry a background-coloured spacer
       so it wouldn't be mistaken for the selection ring beside it, but selection is dashed now and
       the two can't be confused, so the spacer only read as a second border. Rounded to match the
       selection radius, since the two sit against each other. box-shadow (like the outline) draws
       outside the box, so an opaque Shape fill can't paint over it. */
    :global(.stage.editing.interactive .phrase:focus-visible),
    :global(.stage.editing.interactive .shape:focus-visible),
    :global(.stage.editing.interactive .group:focus-visible:not(.root)) {
        border-radius: var(--selection-radius);
        box-shadow: 0 0 0 var(--wordplay-focus-width)
            var(--wordplay-focus-color);
    }

    /* Move cursor signals draggability (but not while editing a phrase's text). */
    :global(.stage.editing.interactive .phrase.selected:not(.entered)),
    :global(.stage.editing.interactive .shape.selected),
    :global(.stage.editing.interactive .group.selected) {
        cursor: move;
    }

    .value {
        /* Creator output is a stable light canvas: pin the color scheme so the
           theme tokens (--wordplay-background/foreground) and any native inputs
           inside output resolve to their light values even when the UI chrome is
           dark. Absolute lch() program colors are unaffected, so a program that
           sets dark colors still gets them. (On browsers without light-dark()
           the legacy @media dark fallback in app.html is global and can't be
           overridden per element — acceptable legacy degradation.) */
        color-scheme: light;

        transform-origin: top right;

        flex-grow: 1;

        display: flex;
        flex-direction: column;
        justify-content: stretch;
        align-items: stretch;
        position: relative;

        overflow: hidden;
        transition:
            ease-in-out background-color,
            filter,
            ease-in,
            height ease-in;
        transition-duration: calc(var(--animation-factor) * 250ms);

        /** Query the container size */
        container-type: inline-size;
    }

    .value.typing {
        filter: blur(1em);
    }

    /* Paused indicator: a small monochrome pause glyph pinned to the block-start
       inline-start corner (out of the way of centered output), a fixed 2em tall
       regardless of stage zoom, at 25% opacity. Its color is set inline to
       contrast with the output background. */
    .pause-overlay {
        position: absolute;
        inset-block-start: var(--wordplay-spacing);
        inset-inline-start: var(--wordplay-spacing);
        pointer-events: none;
        /* Above the stage HUD (.overlay-layer, z-index 10 in StageView) so the
           watermark isn't occluded; pointer-events:none keeps HUD controls usable. */
        z-index: 11;
        opacity: 0.25;
        line-height: 1;
    }

    .pause-glyph {
        /* Scale with the output view's width (cqi = 1% of the .value container's
           inline size) so it stays noticeable on large screens, with a 2em floor
           for small tiles and a ceiling so it never dominates an ultrawide view.
           Independent of stage zoom, which transforms content inside StageView. */
        font-size: clamp(2em, 9cqi, 10em);
        line-height: 1;
    }

    .mini {
        position: static;
        box-shadow: none;
        background-color: var(--wordplay-background);
        pointer-events: none;
        touch-action: none;
    }

    .message {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        padding: var(--wordplay-spacing);
        transform-origin: center;
        align-items: center;
        margin: auto;
        overflow: auto;
        padding-block-start: 2em;
    }

    .message.mini {
        margin: 0;
        padding: 0;
        font-size: inherit;
        overflow: hidden;
        flex-direction: row;
        justify-content: center;
    }

    @keyframes jiggle {
        0% {
            transform: rotate(-1deg) translate(0, 0);
        }
        25% {
            transform: rotate(2deg) translate(0, -1px);
        }
        50% {
            transform: rotate(-3deg) translate(0, 2px);
        }
        75% {
            transform: rotate(-1deg) translate(0, -1px);
        }
        100% {
            transform: rotate(2deg) translate(0, 1px);
        }
    }

    .exception {
        color: var(--wordplay-background);
    }

    .exception :global(.value) {
        color: var(--wordplay-evaluation-color);
    }

    .permission-retry {
        margin-top: 0.75em;
        display: flex;
        justify-content: flex-start;
    }

    .stage-floor-band {
        position: absolute;
        inset-inline: 0;
        inset-block-start: 0;
        /* --floor is the height of a rendering that must not be drawn over, or
           0% when what's showing is ambient, off, or absent. */
        inset-block-end: var(--floor, 0%);
        display: flex;
        flex-direction: column;
        /* Contents pile on the floor; the band's height is only there to cap
           them. The caption sits above the pad because that is DOM order, and
           column layout is why they can never overlap however tall either is. */
        justify-content: flex-end;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        /* Deliberately no align-items: the default stretch is what gives the
           key pad's `.spread` row a full-stage width to space keys across. */
        /* Above the stage HUD (`.overlay-layer`, z-index 10 in StageView), or a
           project that draws there would bury its own caption and controls. */
        z-index: 11;
        /* The band covers the playfield, so it must not eat a tap; the keys
           inside opt back in themselves. */
        pointer-events: none;
    }

    .stage-controls-dock {
        position: absolute;
        inset-inline: 0;
        inset-block-end: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        z-index: 1;
        pointer-events: auto;
    }

    .stage-controls-row {
        position: relative;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: calc(var(--wordplay-spacing) / 2);
        padding: var(--wordplay-spacing);
        pointer-events: none;
    }

    .keyboard {
        width: 100%;
        outline: none;
        opacity: 0;
        display: flex;
        flex-direction: row;
        gap: 0;
    }

    .keyboard-input {
        pointer-events: none;
        touch-action: none;
        border: none;
        flex-grow: 1;
        font-size: var(--wordplay-font-size);
        padding-block: var(--wordplay-spacing);
        padding-inline: var(--wordplay-spacing);
    }

    .keyboard-input:focus {
        outline: none;
    }

    /* Stable chrome, matching the tile toolbar, so the field is legible over any stage background. */
    .chat-footer {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        background: var(--wordplay-background);
        border-block-start: solid var(--wordplay-border-color)
            var(--wordplay-border-width);
    }

    .ignored {
        animation: shake 1;
        animation-duration: calc(var(--animation-factor) * 100ms);
    }

    h2 {
        margin-top: 1em;
    }

    .stage-control-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background-color: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        color: var(--wordplay-foreground);
        font-size: 1em;
        line-height: 1;
        user-select: none;
        padding: 4px 6px;
    }

    .hand-loading,
    .face-loading,
    .object-loading {
        animation: hand-loading-spin 1.5s linear infinite;
        display: inline-block;
        transform-origin: center;
    }

    @keyframes hand-loading-spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
</style>
