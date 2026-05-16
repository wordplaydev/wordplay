import type {
    HandLandmarkerResult,
    NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import CameraFeed from '@input/CameraFeed';
import createStreamEvaluator from '@input/createStreamEvaluator';
import {
    currentHandLandmarker,
    getHandLandmarker,
    isWebKit,
    maybeRecreateHandLandmarker,
    nextDetectTimestamp,
} from '@input/HandLandmarker';
import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import type Locales from '@locale/Locales';
import Bind from '@nodes/Bind';
import NoneType from '@nodes/NoneType';
import NumberLiteral from '@nodes/NumberLiteral';
import NumberType from '@nodes/NumberType';
import StreamDefinition from '@nodes/StreamDefinition';
import type StructureDefinition from '@nodes/StructureDefinition';
import StructureType from '@nodes/StructureType';
import UnionType from '@nodes/UnionType';
import Unit from '@nodes/Unit';
import { createHandStructure, type HandState } from '@output/Hand';
import { createPlaceStructure } from '@output/Place';
import type Evaluation from '@runtime/Evaluation';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import TemporalStreamValue from '@values/TemporalStreamValue';

/* Fallbacks for optional inputs. */
/**
 * 50ms = 20 fps target. MediaPipe hand-landmarker runs comfortably here on
 * most laptops; pushing to 30 fps stresses Safari's WASM and produces a
 * stuttery result anyway. Creators who need faster updates can override.
 */
const DEFAULT_FREQUENCY = 50;

/**
 * Minimum frame interval on WebKit (Safari desktop, all iOS browsers).
 * Hand tracking on Safari is bottlenecked by WASM heap growth: every
 * detection allocates internal MediaPipe tensors that don't shrink, and
 * each emission cascades into a full Evaluator re-evaluation. At 20 fps
 * iOS hits its per-process memory ceiling within ~10 seconds. Capping at
 * 10 fps halves the per-second pressure with negligible perceptible
 * lag for hand visualization. Desktop Chrome/Firefox keep the full 20 fps.
 */
const WEBKIT_MIN_FREQUENCY = 100;

/** Apply the platform-specific floor to a requested frequency. */
function clampFrequencyForPlatform(frequency: number): number {
    return isWebKit() ? Math.max(WEBKIT_MIN_FREQUENCY, frequency) : frequency;
}
/**
 * MediaPipe's hand-landmarker model takes ~192px internally regardless of
 * input size; feeding it the camera's native 720p+ frames just wastes work
 * (and grows the WASM heap). Downsample to a square 192 before detection.
 */
const DEFAULT_RESOLUTION = 192;

/**
 * Camera frame edges map to ±STAGE_EXTENT_METERS / 2 in stage meters on each
 * axis. Both axes use the full range independently of the camera's aspect
 * ratio so motion in any direction fills the stage.
 */
const STAGE_EXTENT_METERS = 20;

/** EMA weight for the emitted place — smooths motion frame-to-frame. */
const PLACE_SMOOTHING_ALPHA = 0.4;

/** Frames a hand may be missing before we revert to the default Hand structure. */
const MISSES_TO_LOSE_LOCK = 10;

/**
 * MediaPipe Hand Landmarker indices. There are 21 landmarks per hand.
 * Wikipedia-style names from the MediaPipe spec — useful so the finger-extension
 * geometry below is readable.
 */
const LM = {
    WRIST: 0,
    THUMB_CMC: 1,
    THUMB_MCP: 2,
    THUMB_IP: 3,
    THUMB_TIP: 4,
    INDEX_MCP: 5,
    INDEX_PIP: 6,
    INDEX_DIP: 7,
    INDEX_TIP: 8,
    MIDDLE_MCP: 9,
    MIDDLE_PIP: 10,
    MIDDLE_DIP: 11,
    MIDDLE_TIP: 12,
    RING_MCP: 13,
    RING_PIP: 14,
    RING_DIP: 15,
    RING_TIP: 16,
    PINKY_MCP: 17,
    PINKY_PIP: 18,
    PINKY_DIP: 19,
    PINKY_TIP: 20,
} as const;

/**
 * A hand tracker backed by MediaPipe Tasks Vision. The MediaPipe runtime
 * (~3–4MB gzipped) is lazy-loaded on first construction; until it's ready
 * the stream emits a default Hand structure (place 0,0, everything false).
 * Once loaded, each frame produces 21 hand landmarks which we collapse into
 * a Place plus six booleans:
 *
 *   - `open`: true if 3+ fingers are extended (counts thumb)
 *   - `fingers`: integer 0–5 of extended fingers
 *   - `thumb`, `index`, `middle`, `ring`, `pinky`: per-finger extended flag
 *   - `palm`: true if the palm faces the camera (vs. back of hand)
 *
 * MediaPipe handles the heavy lifting; the geometry here is straightforward.
 */
export default class Hand extends TemporalStreamValue<StructureValue, HandLandmarkerResult> {
    feed: CameraFeed;
    lastTime: DOMHighResTimeStamp | undefined = undefined;
    /**
     * The `<video>.currentTime` of the last frame we ran detection on. Lets
     * us skip ticks where the camera hasn't actually advanced (e.g. when our
     * tick cadence is faster than the camera's delivery rate), saving the
     * MediaPipe pass and its WASM-side allocations.
     */
    private lastVideoTime: number | undefined = undefined;

    frequency: number;
    resolution: number;

    /** Most recent emitted state — held when MediaPipe misses for a few frames. */
    private state: HandState;
    private consecutiveMisses = 0;
    /** Smoothed place in pixel-normalized space (0..1) so frequency changes don't reset the EMA. */
    private smoothedX: number | undefined;
    private smoothedY: number | undefined;
    /**
     * Last-emitted coords + packed boolean/finger flags. Used to dedup
     * `add()` calls when nothing material has changed: a stationary hand
     * would otherwise trigger 20 full Evaluator re-evaluations per second,
     * each rebuilding the entire Stage output and allocating dozens of
     * StructureValues. Safari can't incrementally GC fast enough at that
     * rate, so the heap spikes until a full collection fires (visible as
     * a hang). Skipping emits on no-op detections keeps the allocation
     * rate well below WebKit's GC threshold.
     */
    private lastEmittedX: number | undefined = undefined;
    private lastEmittedY: number | undefined = undefined;
    private lastEmittedFlags = -1;
    /** The camera device id we last started the feed with. */
    private lastDevice: string | null;

    constructor(
        evaluation: Evaluation,
        frequency: number,
        resolution: number,
    ) {
        const evaluator = evaluation.getEvaluator();
        const defaultState: HandState = {
            place: createPlaceStructure(evaluator, 0, 0, 0),
            open: false,
            fingers: 0,
            thumb: false,
            index: false,
            middle: false,
            ring: false,
            pinky: false,
            palm: false,
        };

        const emptyResult: HandLandmarkerResult = {
            landmarks: [],
            worldLandmarks: [],
            handednesses: [],
            handedness: [],
        };
        super(
            evaluation,
            evaluator.project.shares.input.Hand,
            createHandStructure(evaluator, defaultState),
            emptyResult,
        );

        this.frequency = clampFrequencyForPlatform(frequency);
        this.resolution = Math.max(64, Math.floor(resolution));
        this.lastDevice = this.evaluator.database.Settings.getCamera();
        this.state = defaultState;

        // Square sampling: MediaPipe complains "Using NORM_RECT without
        // IMAGE_DIMENSIONS is only supported for the square ROI" when the
        // input is non-square, and it also rescales internally to a square
        // ~192px anyway. Doing the crop ourselves at the camera-canvas
        // stage skips one rescale and quiets the warning.
        this.feed = new CameraFeed(
            this.evaluator.database,
            this.resolution,
            this.resolution,
            frequency,
        );
    }


    configure(frequency: number, resolution: number) {
        const newResolution = Math.max(64, Math.floor(resolution));
        if (newResolution !== this.resolution) {
            this.resolution = newResolution;
            this.feed.setResolution(newResolution, null);
        }
        this.frequency = clampFrequencyForPlatform(frequency);

        const currentDevice = this.evaluator.database.Settings.getCamera();
        if (currentDevice !== this.lastDevice) {
            this.lastDevice = currentDevice;
            this.feed.setDevice();
        }
    }

    /** Turn a MediaPipe result into a HandState and emit it. */
    react(result: HandLandmarkerResult) {
        const landmarks = result.landmarks?.[0];
        const handedness = result.handedness?.[0]?.[0]?.categoryName as
            | 'Left'
            | 'Right'
            | undefined;

        if (!landmarks || landmarks.length < 21) {
            // Miss — hold last emitted state for a few frames so brief
            // detection gaps don't visibly reset the place.
            this.consecutiveMisses++;
            if (this.consecutiveMisses >= MISSES_TO_LOSE_LOCK) {
                this.smoothedX = undefined;
                this.smoothedY = undefined;
                this.state = {
                    ...this.state,
                    place: createPlaceStructure(this.evaluator, 0, 0, 0),
                    open: false,
                    fingers: 0,
                    thumb: false,
                    index: false,
                    middle: false,
                    ring: false,
                    pinky: false,
                    palm: false,
                };
            }
            this.emitIfChanged(undefined, undefined, 0, result);
            return;
        }

        this.consecutiveMisses = 0;

        // Finger-extended check: tip should be farther from the wrist than the
        // PIP joint, AND the tip-PIP-MCP angle should be reasonably straight.
        // For the thumb (which moves perpendicular to the others), we compare
        // tip-CMC distance instead.
        const thumb = isThumbExtended(landmarks);
        const index = isFingerExtended(
            landmarks,
            LM.INDEX_MCP,
            LM.INDEX_PIP,
            LM.INDEX_TIP,
        );
        const middle = isFingerExtended(
            landmarks,
            LM.MIDDLE_MCP,
            LM.MIDDLE_PIP,
            LM.MIDDLE_TIP,
        );
        const ring = isFingerExtended(
            landmarks,
            LM.RING_MCP,
            LM.RING_PIP,
            LM.RING_TIP,
        );
        const pinky = isFingerExtended(
            landmarks,
            LM.PINKY_MCP,
            LM.PINKY_PIP,
            LM.PINKY_TIP,
        );

        const fingerFlags = [thumb, index, middle, ring, pinky];
        const fingers = fingerFlags.filter((f) => f).length;
        const open = fingers >= 3;

        // Palm vs back: use the sign of the cross-product of (index_mcp - wrist)
        // and (pinky_mcp - wrist) in the image plane, combined with the
        // handedness from MediaPipe. MediaPipe's handedness assumes a mirrored
        // (selfie) view, which matches how the creator perceives their hand.
        const palm = isPalmFacingCamera(landmarks, handedness);

        // Centroid in normalized image coords (0..1). Use the palm center
        // (landmark 9, MIDDLE_MCP) — it's stable across finger movements
        // unlike the geometric centroid of all landmarks.
        const rawX = landmarks[LM.MIDDLE_MCP].x;
        const rawY = landmarks[LM.MIDDLE_MCP].y;

        // EMA smooth across frames.
        if (this.smoothedX === undefined || this.smoothedY === undefined) {
            this.smoothedX = rawX;
            this.smoothedY = rawY;
        } else {
            this.smoothedX =
                PLACE_SMOOTHING_ALPHA * rawX +
                (1 - PLACE_SMOOTHING_ALPHA) * this.smoothedX;
            this.smoothedY =
                PLACE_SMOOTHING_ALPHA * rawY +
                (1 - PLACE_SMOOTHING_ALPHA) * this.smoothedY;
        }

        // Normalized coords (0..1) → stage meters. Mirror x so the place
        // tracks the creator's physical left/right (camera input is raw,
        // sensor-orientation pixels); flip y because pixel y grows down
        // while stage y grows up. Both axes use the full stage extent.
        const stageX =
            -(this.smoothedX - 0.5) * STAGE_EXTENT_METERS;
        const stageY =
            -(this.smoothedY - 0.5) * STAGE_EXTENT_METERS;

        this.state = {
            place: createPlaceStructure(this.evaluator, stageX, stageY, 0),
            open,
            fingers,
            thumb,
            index,
            middle,
            ring,
            pinky,
            palm,
        };

        const flags = packFlags(thumb, index, middle, ring, pinky, palm, open, fingers);
        this.emitIfChanged(this.smoothedX, this.smoothedY, flags, result);
    }

    /**
     * Push a fresh Hand structure to subscribers only if the new state is
     * materially different from the last emission. "Materially" = a smoothed
     * position shift larger than NO_MOTION_THRESHOLD in normalized units
     * (~0.06m in stage meters, sub-pixel-ish on a typical view), or any
     * change in the packed finger/handed flags. A perfectly still hand
     * would otherwise re-emit 20×/sec and force the Evaluator to rebuild
     * the whole Stage output graph each time — that's the allocation rate
     * that overwhelms Safari's incremental GC.
     */
    private emitIfChanged(
        x: number | undefined,
        y: number | undefined,
        flags: number,
        result: HandLandmarkerResult,
    ) {
        const NO_MOTION_THRESHOLD = 0.003;
        const positionUnchanged =
            x === undefined ||
            y === undefined ||
            (this.lastEmittedX !== undefined &&
                this.lastEmittedY !== undefined &&
                Math.abs(x - this.lastEmittedX) < NO_MOTION_THRESHOLD &&
                Math.abs(y - this.lastEmittedY) < NO_MOTION_THRESHOLD);
        if (positionUnchanged && flags === this.lastEmittedFlags) return;

        this.lastEmittedX = x;
        this.lastEmittedY = y;
        this.lastEmittedFlags = flags;
        this.add(createHandStructure(this.evaluator, this.state), result);
    }

    tick(time: DOMHighResTimeStamp) {
        // Skip while the tab is backgrounded. MediaPipe's WASM heap doesn't
        // shrink, but at least we stop feeding it frames the user can't see,
        // which slows the climb significantly on mobile.
        if (typeof document !== 'undefined' && document.hidden) return;

        if (
            this.lastTime !== undefined &&
            time - this.lastTime < this.frequency
        )
            return;

        // Read the live landmarker each tick (instead of caching) so that
        // when HandLandmarker.ts periodically tears down + replaces the
        // singleton to release MediaPipe's WASM heap, we pick up the fresh
        // one without ever holding a reference to a closed instance.
        const landmarker = currentHandLandmarker();
        if (landmarker === undefined) return;

        // Periodically recreate the landmarker so its WebAssembly.Memory
        // (which only grows) gets fully released back to the OS. Cheap
        // call — no-ops until the interval elapses.
        maybeRecreateHandLandmarker();

        const video = this.feed.getVideoElement();
        if (!video || video.readyState < 2) return;

        // Skip if the video hasn't actually advanced since our last detect.
        // The browser may deliver frames at a slower rate than our tick
        // cadence, so without this check we'd re-detect the same frame
        // (burning CPU on identical work).
        if (
            this.lastVideoTime !== undefined &&
            video.currentTime === this.lastVideoTime
        )
            return;
        this.lastVideoTime = video.currentTime;

        // Draw the camera frame into our internal canvas (downsized to
        // `resolution`) and detect against that, rather than against the
        // raw video element. MediaPipe's hand-landmarker re-scales whatever
        // input it gets to ~192px internally; feeding it the full 720p+
        // camera stream just wastes processing time and grows the WASM
        // heap (which is the most likely cause of the eventual tab crash).
        const frame = this.feed.getCanvasFrame();
        if (!frame) return;

        this.lastTime = time;
        // MediaPipe requires strictly monotonic timestamps across the whole
        // landmarker lifetime, which spans Wordplay re-runs that reset
        // `time`. nextDetectTimestamp() bridges those by tracking
        // performance.now() across the page session.
        const result = landmarker.detectForVideo(frame, nextDetectTimestamp());
        this.react(result);
    }

    start() {
        this.feed.start();
        // Kick off MediaPipe loading early so it can overlap with the camera
        // permission prompt and video stream warm-up. We don't store the
        // result — tick() reads the live singleton via currentHandLandmarker().
        void getHandLandmarker();
    }

    stop() {
        this.feed.stop();
    }

    getType() {
        return NumberType.make();
    }
}

/**
 * Pack the seven Hand booleans plus the finger count into a single integer
 * so the dedup check in emitIfChanged is one === comparison. Finger count
 * is 0–5 so it fits in the high bits without overlap.
 */
function packFlags(
    thumb: boolean,
    index: boolean,
    middle: boolean,
    ring: boolean,
    pinky: boolean,
    palm: boolean,
    open: boolean,
    fingers: number,
): number {
    return (
        (thumb ? 1 : 0) |
        (index ? 2 : 0) |
        (middle ? 4 : 0) |
        (ring ? 8 : 0) |
        (pinky ? 16 : 0) |
        (palm ? 32 : 0) |
        (open ? 64 : 0) |
        (fingers << 8)
    );
}

/**
 * A non-thumb finger is "extended" when its tip is farther from the wrist
 * than its PIP joint along the finger's axis. Practically: compute the
 * signed projection of (tip - PIP) onto (PIP - MCP); positive means the tip
 * is past the PIP in the MCP→PIP direction, which is the case for an
 * extended finger. A small dead-zone avoids flipping on partially-curled
 * fingers.
 */
function isFingerExtended(
    landmarks: NormalizedLandmark[],
    mcp: number,
    pip: number,
    tip: number,
): boolean {
    const mcpP = landmarks[mcp];
    const pipP = landmarks[pip];
    const tipP = landmarks[tip];
    // Vector from MCP to PIP (the "extended direction").
    const ax = pipP.x - mcpP.x;
    const ay = pipP.y - mcpP.y;
    // Vector from PIP to TIP.
    const bx = tipP.x - pipP.x;
    const by = tipP.y - pipP.y;
    // Dot product; positive = continuing in same direction (extended).
    // Normalize by |a||b| so the comparison is angle-based.
    const aLen = Math.hypot(ax, ay) || 1e-6;
    const bLen = Math.hypot(bx, by) || 1e-6;
    const cosAngle = (ax * bx + ay * by) / (aLen * bLen);
    return cosAngle > 0.5; // ~60° dead zone; tightly curled fingers fail
}

/**
 * The thumb is "extended" when **both** of these hold:
 *
 *   1. It's roughly straight at the IP joint — the MCP→IP and IP→TIP
 *      segments point in similar directions (small bend angle).
 *   2. The tip sits well outside the palm — far enough from the palm
 *      center that it can't be tucked across the fingers.
 *
 * Either test alone is insufficient: a curled fist usually has a fairly
 * straight thumb tucked across the palm (passes #1 but fails #2), and a
 * thumb laid flat against the side of the hand has its tip far from the
 * palm center but is folded at the IP joint (passes #2 but fails #1).
 * Requiring both rules out the common false positives.
 */
function isThumbExtended(landmarks: NormalizedLandmark[]): boolean {
    const mcp = landmarks[LM.THUMB_MCP];
    const ip = landmarks[LM.THUMB_IP];
    const tip = landmarks[LM.THUMB_TIP];

    const ax = ip.x - mcp.x;
    const ay = ip.y - mcp.y;
    const bx = tip.x - ip.x;
    const by = tip.y - ip.y;
    const aLen = Math.hypot(ax, ay) || 1e-6;
    const bLen = Math.hypot(bx, by) || 1e-6;
    const straight = (ax * bx + ay * by) / (aLen * bLen) > 0.7;

    const palmCenter = landmarks[LM.MIDDLE_MCP];
    const wrist = landmarks[LM.WRIST];
    const palmSize = Math.hypot(
        palmCenter.x - wrist.x,
        palmCenter.y - wrist.y,
    );
    const tipFromPalm = Math.hypot(
        tip.x - palmCenter.x,
        tip.y - palmCenter.y,
    );
    const farEnough = tipFromPalm > palmSize * 0.75;

    return straight && farEnough;
}

/**
 * Palm vs back-of-hand detection. The 2D image-plane cross-product of
 * (index_mcp - wrist) × (pinky_mcp - wrist) flips sign depending on which
 * side of the hand faces the camera. Which sign means "palm" depends on
 * which hand it is (MediaPipe's `handedness` is reported assuming the
 * selfie-view convention, which matches the creator's perception).
 */
function isPalmFacingCamera(
    landmarks: NormalizedLandmark[],
    handedness: 'Left' | 'Right' | undefined,
): boolean {
    const wrist = landmarks[LM.WRIST];
    const index = landmarks[LM.INDEX_MCP];
    const pinky = landmarks[LM.PINKY_MCP];
    const ax = index.x - wrist.x;
    const ay = index.y - wrist.y;
    const bx = pinky.x - wrist.x;
    const by = pinky.y - wrist.y;
    const cross = ax * by - ay * bx;
    // For a right hand in selfie view with palm facing camera, pinky sits to
    // the viewer's right of the index → cross is positive. Left hand mirrors.
    if (handedness === 'Right') return cross > 0;
    if (handedness === 'Left') return cross < 0;
    // Unknown handedness: bias toward palm = true (more common pose).
    return cross > 0;
}

export function createHandDefinition(
    locales: Locales,
    HandType: StructureDefinition,
) {
    const FrequencyBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Hand.frequency.doc),
        getNameLocales(locales, (locale) => locale.input.Hand.frequency.names),
        UnionType.make(NumberType.make(Unit.reuse(['ms'])), NoneType.make()),
        NumberLiteral.make(DEFAULT_FREQUENCY, Unit.reuse(['ms'])),
    );

    const ResolutionBind = Bind.make(
        getDocLocales(locales, (locale) => locale.input.Hand.resolution.doc),
        getNameLocales(locales, (locale) => locale.input.Hand.resolution.names),
        UnionType.make(NumberType.make(Unit.reuse(['px'])), NoneType.make()),
        NumberLiteral.make(DEFAULT_RESOLUTION, Unit.reuse(['px'])),
    );

    const outputType = new StructureType(HandType);

    return StreamDefinition.make(
        getDocLocales(locales, (locale) => locale.input.Hand.doc),
        getNameLocales(locales, (locale) => locale.input.Hand.names),
        [FrequencyBind, ResolutionBind],
        createStreamEvaluator(
            outputType,
            Hand,
            (evaluation) =>
                new Hand(
                    evaluation,
                    evaluation
                        .get(FrequencyBind.names, NumberValue)
                        ?.toNumber() ?? DEFAULT_FREQUENCY,
                    evaluation
                        .get(ResolutionBind.names, NumberValue)
                        ?.toNumber() ?? DEFAULT_RESOLUTION,
                ),
            (stream, evaluation) => {
                stream.configure(
                    evaluation
                        .get(FrequencyBind.names, NumberValue)
                        ?.toNumber() ?? DEFAULT_FREQUENCY,
                    evaluation
                        .get(ResolutionBind.names, NumberValue)
                        ?.toNumber() ?? DEFAULT_RESOLUTION,
                );
            },
        ),
        outputType,
    );
}
