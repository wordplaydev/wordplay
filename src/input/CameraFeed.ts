import type { Database } from '@db/Database';
import {
    acquireCameraSource,
    type CameraSourceHandle,
} from '@input/CameraSource';

/**
 * A per-consumer view onto the shared camera. The expensive, genuinely-shared
 * resources — the `MediaStream` and the decoding `<video>` — live in
 * `CameraSource` and are reference-counted across every stream using the same
 * device. This class owns only the cheap, consumer-specific bits: a `<canvas>`
 * at the caller's target sampling resolution and the aspect-crop math that maps
 * the shared sensor frame into it. It exposes either raw `ImageData` (for
 * callers that want pixels) or the shared `HTMLVideoElement` itself (for
 * callers that hand the stream to an ML model). Color-space conversion is *not*
 * this class's responsibility — callers that need LCH do it themselves.
 *
 * Pass targetHeight as null to use the camera sensor's full field of view;
 * the effective sampling height is derived from the actual sensor aspect
 * ratio once the shared source resolves.
 */
export default class CameraFeed {
    private database: Database;
    private targetWidth: number;
    /** Requested target height in pixels, or null to fill the sensor's full FOV. */
    private targetHeight: number | null;
    /** Resolved height after sensor info arrives; matches targetHeight when fixed. */
    private effectiveHeight: number;
    private idealFrequency: number;
    /** Called once all attempts to acquire a camera stream have failed (typically a denied permission). */
    private onDenied: (() => void) | undefined;

    private source: CameraSourceHandle | undefined;
    private canvas: HTMLCanvasElement | undefined;
    private context: CanvasRenderingContext2D | null = null;
    /** Source sub-rectangle (in sensor pixels) cropped to the target aspect. */
    private sourceX = 0;
    private sourceY = 0;
    private sourceWidth = 0;
    private sourceHeight = 0;
    /** True once the crop + canvas size have been computed for the live sensor. */
    private configured = false;

    constructor(
        database: Database,
        targetWidth: number,
        targetHeight: number | null,
        idealFrequency: number,
        onDenied?: () => void,
    ) {
        this.database = database;
        this.targetWidth = targetWidth;
        this.targetHeight = targetHeight;
        // Falls back to a square placeholder until the sensor aspect is known.
        this.effectiveHeight = targetHeight ?? targetWidth;
        this.idealFrequency = idealFrequency;
        this.onDenied = onDenied;
    }

    /** Update the target sampling resolution. Pass null height to fill the sensor. */
    setResolution(width: number, height: number | null) {
        if (width === this.targetWidth && height === this.targetHeight) return;
        this.targetWidth = width;
        this.targetHeight = height;
        this.effectiveHeight = height ?? width;
        // Recompute against the live sensor on the next frame.
        this.configured = false;
    }

    /** Restart against whatever camera device is now selected. */
    setDevice() {
        if (!this.source) return;
        this.source.release();
        this.source = acquireCameraSource(
            this.database,
            this.idealFrequency,
            this.onDenied,
        );
        this.configured = false;
    }

    /** True once the underlying video is ready and a frame can be captured. */
    isReady() {
        return this.source?.isReady() ?? false;
    }

    /** True if camera permission was denied or the API is unavailable. */
    isFailed() {
        return this.source?.isFailed() ?? false;
    }

    /**
     * Capture one frame from the camera and return it as raw RGBA ImageData
     * at the configured target resolution. Returns undefined if the camera
     * isn't ready. Callers convert to whatever color space they need.
     */
    grabImageData(): ImageData | undefined {
        if (!this.drawFrame()) return undefined;
        return this.context?.getImageData(
            0,
            0,
            this.targetWidth,
            this.effectiveHeight,
            { colorSpace: 'srgb' },
        );
    }

    /**
     * Return the shared <video> element. Useful for callers (like ML models)
     * that prefer to consume the live stream directly instead of sampling into
     * a canvas first.
     */
    getVideoElement(): HTMLVideoElement | undefined {
        return this.source?.getVideoElement();
    }

    /**
     * Draw the current video frame into the internal canvas at the target
     * sampling resolution and return the canvas. Callers (typically ML
     * models like MediaPipe) get a small, ready-to-process frame without
     * any pixel-array allocation — and crucially, without the model
     * processing the camera's full native resolution, which can be 10–30x
     * larger than needed and cause noticeable WASM heap growth.
     */
    getCanvasFrame(): HTMLCanvasElement | undefined {
        return this.drawFrame() ? this.canvas : undefined;
    }

    /**
     * Draw the shared video's cropped sub-rectangle into our canvas. Returns
     * false (drawing nothing) until the shared source is ready. Lazily computes
     * the crop + canvas size the first time the sensor is available, since the
     * shared source resolves asynchronously.
     */
    private drawFrame(): boolean {
        const video = this.source?.getVideoElement();
        if (!video || !this.isReady() || !this.context || !this.canvas)
            return false;
        if (!this.configured && !this.recomputeDimensions()) return false;
        this.context.drawImage(
            video,
            this.sourceX,
            this.sourceY,
            this.sourceWidth,
            this.sourceHeight,
            0,
            0,
            this.targetWidth,
            this.effectiveHeight,
        );
        return true;
    }

    start() {
        if (this.source !== undefined) return;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', {
            alpha: false,
            willReadFrequently: true,
        });
        canvas.style.display = 'none';
        document.body.appendChild(canvas);
        this.canvas = canvas;
        this.context = context;
        this.source = acquireCameraSource(
            this.database,
            this.idealFrequency,
            this.onDenied,
        );
    }

    stop() {
        this.source?.release();
        this.source = undefined;
        if (this.canvas && document.body.contains(this.canvas))
            document.body.removeChild(this.canvas);
        this.canvas = undefined;
        this.context = null;
        this.configured = false;
    }

    /**
     * Resolve effectiveHeight from sensor + target, then compute the source
     * sub-rectangle and size our canvas. With targetHeight === null we use the
     * full sensor; otherwise we crop to match the target aspect ratio and
     * center the crop. Returns false if the sensor size isn't known yet.
     */
    private recomputeDimensions(): boolean {
        const settings = this.source?.getSettings();
        if (!settings || !settings.width || !settings.height || !this.canvas)
            return false;

        const sensorAspect = settings.width / settings.height;

        if (this.targetHeight === null) {
            // Fill the entire sensor; derive sampling height from its aspect.
            this.effectiveHeight = Math.max(
                1,
                Math.round(this.targetWidth / sensorAspect),
            );
            this.sourceX = 0;
            this.sourceY = 0;
            this.sourceWidth = settings.width;
            this.sourceHeight = settings.height;
        } else {
            this.effectiveHeight = this.targetHeight;
            const targetAspect = this.targetWidth / this.targetHeight;
            // Fit to height
            if (targetAspect < sensorAspect) {
                this.sourceHeight = settings.height;
                this.sourceWidth = settings.height * targetAspect;
                this.sourceX = (settings.width - this.sourceWidth) / 2;
                this.sourceY = 0;
            }
            // Fit to width
            else {
                this.sourceWidth = settings.width;
                this.sourceHeight = this.sourceWidth / targetAspect;
                this.sourceX = 0;
                this.sourceY = (settings.height - this.sourceHeight) / 2;
            }
        }

        this.canvas.width = this.targetWidth;
        this.canvas.height = this.effectiveHeight;
        this.configured = true;
        return true;
    }
}
