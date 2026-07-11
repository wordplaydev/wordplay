import CameraFeed from '@input/CameraFeed';
import { denyConsent, Permission } from '@input/permissions';
import {
    isWebKit,
    nextDetectTimestamp,
} from '@input/createLandmarkerRuntime';
import type StreamDefinition from '@nodes/StreamDefinition';
import NumberType from '@nodes/NumberType';
import type Evaluation from '@runtime/Evaluation';
import PermissionException from '@values/PermissionException';
import StructureValue from '@values/StructureValue';
import TemporalStreamValue from '@values/TemporalStreamValue';

/**
 * 50ms = 20 fps target. MediaPipe landmarkers run comfortably here on most
 * laptops; pushing to 30 fps stresses Safari's WASM and produces a stuttery
 * result anyway. Creators who need faster updates can override.
 */
export const DEFAULT_FREQUENCY = 50;

/**
 * MediaPipe's landmarker models take a small fixed input (~192px) internally
 * regardless of input size; feeding them the camera's native 720p+ frames just
 * wastes work (and grows the WASM heap). Downsample to a square 192 before
 * detection.
 */
export const DEFAULT_RESOLUTION = 192;

/**
 * Minimum frame interval on WebKit (Safari desktop, all iOS browsers). Tracking
 * on Safari is bottlenecked by WASM heap growth: every detection allocates
 * internal MediaPipe tensors that don't shrink, and each emission cascades into
 * a full Evaluator re-evaluation. At 20 fps iOS hits its per-process memory
 * ceiling within ~10 seconds. Capping at 10 fps halves the per-second pressure
 * with negligible perceptible lag. Desktop Chrome/Firefox keep the full 20 fps.
 */
const WEBKIT_MIN_FREQUENCY = 100;

/** Apply the platform-specific floor to a requested frequency. */
export function clampFrequencyForPlatform(frequency: number): number {
    return isWebKit() ? Math.max(WEBKIT_MIN_FREQUENCY, frequency) : frequency;
}

/**
 * Camera frame edges map to ±STAGE_EXTENT_METERS / 2 in stage meters on each
 * axis. Both axes use the full range independently of the camera's aspect ratio
 * so motion in any direction fills the stage.
 */
const STAGE_EXTENT_METERS = 20;

/** EMA weight for the emitted place — smooths motion frame-to-frame. */
const PLACE_SMOOTHING_ALPHA = 0.4;

/** Position dedup threshold in normalized (0..1) units. */
const NO_MOTION_THRESHOLD = 0.003;

/**
 * The minimal slice of a landmarker runtime the base needs each tick. The
 * concrete `LandmarkerRuntime<T>` from createLandmarkerRuntime satisfies this
 * structurally (its `current()` returns a landmarker whose `detectForVideo`
 * accepts a canvas and returns the raw result type).
 */
type Detector<Result> = {
    current():
        | {
              detectForVideo(
                  image: HTMLCanvasElement,
                  timestamp: number,
              ): Result;
          }
        | undefined;
    maybeRecreate(): void;
    get(): Promise<unknown>;
};

/**
 * Shared machinery for camera-backed MediaPipe streams (Hand, Face). Owns the
 * per-consumer `CameraFeed`, the per-frame guard chain and detect loop, camera
 * permission handling, reconfiguration, EMA place smoothing, and the emit-dedup
 * that keeps a still subject from forcing ~20 Evaluator re-evaluations/sec.
 * Subclasses supply only the model-specific `react(result)` — turning one
 * detection into a structure and emitting it via `emitIfChanged`.
 */
export default abstract class CameraLandmarkStream<
    Result,
> extends TemporalStreamValue<StructureValue, Result> {
    feed: CameraFeed;
    protected frequency: number;
    protected resolution: number;

    private readonly runtime: Detector<Result>;

    private lastTime: DOMHighResTimeStamp | undefined = undefined;
    /**
     * The `<video>.currentTime` of the last frame we ran detection on. Lets us
     * skip ticks where the camera hasn't actually advanced, saving the
     * MediaPipe pass and its WASM-side allocations.
     */
    private lastVideoTime: number | undefined = undefined;
    /** The camera device id we last started the feed with. */
    private lastDevice: string | null;

    /** Smoothed place in pixel-normalized space (0..1) so frequency changes don't reset the EMA. */
    protected smoothedX: number | undefined;
    protected smoothedY: number | undefined;

    /** Last-emitted coords + opaque change key, used to dedup `add()` calls. */
    private lastEmittedX: number | undefined = undefined;
    private lastEmittedY: number | undefined = undefined;
    private lastEmittedKey: string | undefined = undefined;

    protected constructor(
        evaluation: Evaluation,
        definition: StreamDefinition,
        initialValue: StructureValue,
        initialRaw: Result,
        runtime: Detector<Result>,
        frequency: number,
        resolution: number,
    ) {
        super(evaluation, definition, initialValue, initialRaw);

        this.runtime = runtime;
        this.frequency = clampFrequencyForPlatform(frequency);
        this.resolution = Math.max(64, Math.floor(resolution));
        this.lastDevice = this.evaluator.database.Settings.getCamera();

        // Square sampling: MediaPipe's hand landmarker complains "Using
        // NORM_RECT without IMAGE_DIMENSIONS is only supported for the square
        // ROI" on non-square input and rescales to a square internally anyway;
        // cropping to a square ourselves skips one rescale and quiets it.
        this.feed = new CameraFeed(
            this.evaluator.database,
            this.resolution,
            this.resolution,
            frequency,
            () => this.handleCameraDenied(),
        );
    }

    private handleCameraDenied() {
        denyConsent(Permission.Camera);
        this.evaluator.replaceMainValue(
            new PermissionException(
                this.creator,
                this.evaluator,
                Permission.Camera,
            ),
        );
        this.evaluator.broadcast();
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

        // Read the live landmarker each tick (instead of caching) so that when
        // the runtime periodically tears down + replaces the singleton to
        // release MediaPipe's WASM heap, we pick up the fresh one without ever
        // holding a reference to a closed instance.
        const landmarker = this.runtime.current();
        if (landmarker === undefined) return;

        // Periodically recreate the landmarker so its WebAssembly.Memory (which
        // only grows) gets fully released. Cheap — no-ops until the interval.
        this.runtime.maybeRecreate();

        const video = this.feed.getVideoElement();
        if (!video || video.readyState < 2) return;

        // Skip if the video hasn't actually advanced since our last detect. The
        // browser may deliver frames slower than our tick cadence, so without
        // this we'd re-detect the same frame (burning CPU on identical work).
        if (
            this.lastVideoTime !== undefined &&
            video.currentTime === this.lastVideoTime
        )
            return;
        this.lastVideoTime = video.currentTime;

        // Detect against the downsized canvas frame, not the raw video: the
        // models re-scale to ~192px internally, so feeding the full 720p+ stream
        // just wastes time and grows the WASM heap.
        const frame = this.feed.getCanvasFrame();
        if (!frame) return;

        this.lastTime = time;
        // MediaPipe requires strictly monotonic timestamps across the whole
        // landmarker lifetime, which spans Wordplay re-runs that reset `time`;
        // nextDetectTimestamp() bridges those via performance.now().
        const result = landmarker.detectForVideo(frame, nextDetectTimestamp());
        this.react(result);
    }

    /** Turn one MediaPipe detection into a structure and emit via emitIfChanged. */
    abstract react(result: Result): void;

    /** EMA-smooth a normalized (0..1) place across frames; returns the smoothed coords. */
    protected smoothPlace(
        rawX: number,
        rawY: number,
    ): { x: number; y: number } {
        let x: number;
        let y: number;
        if (this.smoothedX === undefined || this.smoothedY === undefined) {
            x = rawX;
            y = rawY;
        } else {
            x =
                PLACE_SMOOTHING_ALPHA * rawX +
                (1 - PLACE_SMOOTHING_ALPHA) * this.smoothedX;
            y =
                PLACE_SMOOTHING_ALPHA * rawY +
                (1 - PLACE_SMOOTHING_ALPHA) * this.smoothedY;
        }
        this.smoothedX = x;
        this.smoothedY = y;
        return { x, y };
    }

    /** Drop the EMA so the next detection re-seeds it (used after a lost lock). */
    protected resetSmoothing() {
        this.smoothedX = undefined;
        this.smoothedY = undefined;
    }

    /**
     * Map one normalized (0..1) axis to stage meters. Mirrors/flips: camera x
     * grows toward the sensor's right and y grows down, while the creator
     * perceives a mirrored view and stage y grows up — the shared negation
     * handles both (x-mirror and y-flip are the same sign flip about center).
     */
    protected toStageMeters(normalized: number): number {
        return -(normalized - 0.5) * STAGE_EXTENT_METERS;
    }

    /**
     * Push a fresh structure to subscribers only if the new state is materially
     * different from the last emission: a smoothed position shift larger than
     * NO_MOTION_THRESHOLD, or any change in the subclass's opaque `key`. A
     * perfectly still subject would otherwise re-emit ~20×/sec and force the
     * Evaluator to rebuild the whole Stage output each time — the allocation
     * rate that overwhelms Safari's incremental GC. The value is built lazily so
     * unchanged detections cost nothing.
     */
    protected emitIfChanged(
        x: number | undefined,
        y: number | undefined,
        key: string,
        raw: Result,
        makeValue: () => StructureValue,
    ) {
        const positionUnchanged =
            x === undefined ||
            y === undefined ||
            (this.lastEmittedX !== undefined &&
                this.lastEmittedY !== undefined &&
                Math.abs(x - this.lastEmittedX) < NO_MOTION_THRESHOLD &&
                Math.abs(y - this.lastEmittedY) < NO_MOTION_THRESHOLD);
        if (positionUnchanged && key === this.lastEmittedKey) return;

        this.lastEmittedX = x;
        this.lastEmittedY = y;
        this.lastEmittedKey = key;
        this.add(makeValue(), raw);
    }

    start() {
        this.feed.start();
        // Kick off MediaPipe loading early so it overlaps with the camera
        // permission prompt and video warm-up. tick() reads the live singleton.
        void this.runtime.get();
    }

    stop() {
        this.feed.stop();
    }

    getType() {
        return NumberType.make();
    }
}
