import type { Database } from '@db/Database';

type CameraConfig = {
    stream: MediaStream;
    video: HTMLVideoElement;
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    sourceX: number;
    sourceY: number;
    sourceWidth: number;
    sourceHeight: number;
};

/**
 * Wraps the browser camera API and frame sampling. Holds the MediaStream, a
 * hidden <video> + <canvas>, and exposes either raw `ImageData` (for callers
 * that want pixels) or the live `HTMLVideoElement` itself (for callers that
 * want to hand the stream to an ML model). Color-space conversion is *not*
 * the responsibility of this class — callers that need LCH or other spaces
 * do the conversion themselves.
 *
 * Pass targetHeight as null to use the camera sensor's full field of view;
 * the effective sampling height is derived from the actual sensor aspect
 * ratio once start() resolves.
 */
export default class CameraFeed {
    private database: Database;
    private targetWidth: number;
    /** Requested target height in pixels, or null to fill the sensor's full FOV. */
    private targetHeight: number | null;
    /** Resolved height after sensor info arrives; matches targetHeight when fixed. */
    private effectiveHeight: number;
    private idealFrequency: number;
    private config: CameraConfig | undefined | null;
    private playing = false;
    private stopped = false;

    constructor(
        database: Database,
        targetWidth: number,
        targetHeight: number | null,
        idealFrequency: number,
    ) {
        this.database = database;
        this.targetWidth = targetWidth;
        this.targetHeight = targetHeight;
        // Falls back to a square placeholder until the sensor aspect is known.
        this.effectiveHeight = targetHeight ?? targetWidth;
        this.idealFrequency = idealFrequency;
    }

    /** Update the target sampling resolution. Pass null height to fill the sensor. */
    setResolution(width: number, height: number | null) {
        if (width === this.targetWidth && height === this.targetHeight) return;
        this.targetWidth = width;
        this.targetHeight = height;
        if (this.config) {
            this.recomputeDimensions();
            this.config.canvas.width = this.targetWidth;
            this.config.canvas.height = this.effectiveHeight;
        } else {
            this.effectiveHeight = height ?? width;
        }
    }

    /** Restart the stream with a different camera device. */
    setDevice() {
        if (!this.config) return;
        this.stop();
        this.config = undefined;
        this.playing = false;
        this.stopped = false;
        this.start();
    }

    /** True once the underlying video is ready and a frame can be captured. */
    isReady() {
        return this.config != null && this.playing;
    }

    /** True if camera permission was denied or the API is unavailable. */
    isFailed() {
        return this.config === null;
    }

    /**
     * Capture one frame from the camera and return it as raw RGBA ImageData
     * at the configured target resolution. Returns undefined if the camera
     * isn't ready. Callers convert to whatever color space they need.
     */
    grabImageData(): ImageData | undefined {
        if (!this.config) return undefined;

        const { context, video, sourceX, sourceY, sourceWidth, sourceHeight } =
            this.config;
        const width = this.targetWidth;
        const height = this.effectiveHeight;

        context.drawImage(
            video,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            width,
            height,
        );

        return context.getImageData(0, 0, width, height, {
            colorSpace: 'srgb',
        });
    }

    /**
     * Return the underlying <video> element. Useful for callers (like ML
     * models) that prefer to consume the live stream directly instead of
     * sampling into a canvas first.
     */
    getVideoElement(): HTMLVideoElement | undefined {
        return this.config?.video;
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
        if (!this.config) return undefined;
        const { context, video, sourceX, sourceY, sourceWidth, sourceHeight } =
            this.config;
        context.drawImage(
            video,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            0,
            0,
            this.targetWidth,
            this.effectiveHeight,
        );
        return this.config.canvas;
    }

    start() {
        if (
            typeof navigator === 'undefined' ||
            typeof navigator.mediaDevices === 'undefined' ||
            this.config !== undefined
        )
            return;

        const base: MediaTrackConstraints = {
            width: { min: this.targetWidth },
            frameRate: { ideal: 1000 / this.idealFrequency },
        };
        // Only constrain height when caller pinned it; otherwise let the sensor
        // pick its native size so we can read its aspect ratio.
        if (this.targetHeight !== null)
            base.height = { min: this.targetHeight };

        // Build an ordered list of attempts. We always want to end up with
        // *some* working camera, so we degrade gracefully: if the user picked a
        // specific device that's now unplugged, fall back to the user-facing
        // default, and beyond that to any available camera.
        const device = this.database.Settings.getCamera();
        const attempts: MediaTrackConstraints[] = [];
        if (device) attempts.push({ ...base, deviceId: { exact: device } });
        attempts.push({ ...base, facingMode: 'user' });
        attempts.push(base);

        this.requestStream(attempts, 0);
    }

    /** Try each constraint set in order until one succeeds. */
    private requestStream(
        attempts: MediaTrackConstraints[],
        index: number,
    ): void {
        if (index >= attempts.length) {
            this.config = null;
            return;
        }
        navigator.mediaDevices
            .getUserMedia({ audio: false, video: attempts[index] })
            .then((stream) => this.attachStream(stream))
            .catch(() => this.requestStream(attempts, index + 1));
    }

    /** Wire up a successfully-acquired MediaStream as our config. */
    private attachStream(stream: MediaStream) {
        if (this.stopped) {
            stream.getTracks().forEach((track) => track.stop());
            return;
        }
        const settings = stream.getVideoTracks()[0].getSettings();
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', {
            alpha: false,
            willReadFrequently: true,
        });

        if (settings && settings.width && settings.height && context) {
            const video = document.createElement('video');
            const config: CameraConfig = {
                video,
                canvas,
                context,
                stream,
                // Filled in by recomputeDimensions below
                sourceX: 0,
                sourceY: 0,
                sourceWidth: settings.width,
                sourceHeight: settings.height,
            };
            this.config = config;
            this.recomputeDimensions();

            canvas.width = this.targetWidth;
            canvas.height = this.effectiveHeight;

            canvas.style.display = 'none';
            video.style.display = 'none';

            document.body.appendChild(video);
            document.body.appendChild(canvas);

            video.srcObject = stream;
            video.play().then(() => (this.playing = true));
        } else this.config = null;
    }

    stop() {
        this.stopped = true;
        if (this.config) {
            if (this.playing)
                this.config.stream.getTracks().forEach((track) => track.stop());
            this.config.video.srcObject = null;

            if (document.body.contains(this.config.canvas))
                document.body.removeChild(this.config.canvas);
            if (document.body.contains(this.config.video))
                document.body.removeChild(this.config.video);
        }
    }

    /**
     * Resolve effectiveHeight from sensor + target, then compute the source
     * sub-rectangle. With targetHeight === null we use the full sensor; otherwise
     * we crop to match the target aspect ratio and center the crop.
     */
    private recomputeDimensions() {
        if (!this.config) return;
        const settings = this.config.stream.getVideoTracks()[0].getSettings();
        if (!settings || !settings.width || !settings.height) return;

        const sensorAspect = settings.width / settings.height;

        if (this.targetHeight === null) {
            // Fill the entire sensor; derive sampling height from its aspect.
            this.effectiveHeight = Math.max(
                1,
                Math.round(this.targetWidth / sensorAspect),
            );
            this.config.sourceX = 0;
            this.config.sourceY = 0;
            this.config.sourceWidth = settings.width;
            this.config.sourceHeight = settings.height;
            return;
        }

        this.effectiveHeight = this.targetHeight;
        const targetAspect = this.targetWidth / this.targetHeight;

        let sourceX: number, sourceY: number;
        let sourceWidth: number, sourceHeight: number;
        // Fit to height
        if (targetAspect < sensorAspect) {
            sourceHeight = settings.height;
            sourceWidth = settings.height * targetAspect;
            sourceX = (settings.width - sourceWidth) / 2;
            sourceY = 0;
        }
        // Fit to width
        else {
            sourceWidth = settings.width;
            sourceHeight = sourceWidth / targetAspect;
            sourceX = 0;
            sourceY = (settings.height - sourceHeight) / 2;
        }

        this.config.sourceX = sourceX;
        this.config.sourceY = sourceY;
        this.config.sourceWidth = sourceWidth;
        this.config.sourceHeight = sourceHeight;
    }
}
