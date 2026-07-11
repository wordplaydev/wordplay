import type { Database } from '@db/Database';

/**
 * The genuinely-shared, expensive half of camera access: one `MediaStream`
 * plus one hidden decoding `<video>` element, reference-counted and keyed by
 * the selected camera device. Multiple consumers of the same device (e.g. the
 * `Camera`, `Hand`, and `Face` streams running in one project) share a single
 * `getUserMedia` session and a single `<video>` instead of each opening their
 * own. That matters: every extra `<video>` pools unread frames at ~30MB/s
 * (see the frameRate note in `start` below), so N independent feeds multiply
 * both the sensor session and that memory pressure.
 *
 * Per-consumer sampling (canvas downscale, aspect crop, pixel readback) stays
 * in `CameraFeed`, which draws from the shared `<video>` this class exposes.
 */

/** A live consumer of a shared source; drives frame-rate negotiation + denial. */
type Consumer = {
    idealFrequency: number;
    onDenied: (() => void) | undefined;
};

class SharedSource {
    private database: Database;
    /** undefined = not yet started, null = failed/denied. */
    private stream: MediaStream | undefined | null = undefined;
    private video: HTMLVideoElement | undefined;
    private playing = false;
    private stopped = false;
    /** True once start() has kicked off acquisition, so it only runs once. */
    private started = false;
    private readonly consumers = new Set<Consumer>();

    constructor(database: Database) {
        this.database = database;
    }

    add(consumer: Consumer) {
        this.consumers.add(consumer);
        if (!this.started) this.start();
        else if (this.stream === null) consumer.onDenied?.();
        else this.applyFrameRate();
    }

    /** Returns true when the source has no remaining consumers and was torn down. */
    remove(consumer: Consumer): boolean {
        this.consumers.delete(consumer);
        if (this.consumers.size === 0) {
            this.stop();
            return true;
        }
        this.applyFrameRate();
        return false;
    }

    getVideoElement(): HTMLVideoElement | undefined {
        return this.video;
    }

    getSettings(): MediaTrackSettings | undefined {
        return this.stream
            ? this.stream.getVideoTracks()[0]?.getSettings()
            : undefined;
    }

    isReady(): boolean {
        return this.stream != null && this.playing;
    }

    isFailed(): boolean {
        return this.stream === null;
    }

    /** The fastest rate any active consumer wants, as a frameRate.max hint. */
    private fastestFrameRate(): number {
        let minFrequency = Infinity;
        for (const c of this.consumers)
            minFrequency = Math.min(minFrequency, c.idealFrequency);
        return 1000 / minFrequency;
    }

    /**
     * Re-negotiate the track's frameRate cap live as consumers come and go, so
     * the camera never produces faster than the fastest active consumer reads.
     * Best-effort — a browser that ignores the constraint just keeps its rate.
     */
    private applyFrameRate() {
        if (!this.stream) return;
        const track = this.stream.getVideoTracks()[0];
        void track
            ?.applyConstraints({ frameRate: { max: this.fastestFrameRate() } })
            .catch(() => {});
    }

    private start() {
        this.started = true;
        if (
            typeof navigator === 'undefined' ||
            typeof navigator.mediaDevices === 'undefined'
        ) {
            this.stream = null;
            for (const c of this.consumers) c.onDenied?.();
            return;
        }

        const base: MediaTrackConstraints = {
            // Cap the camera's frame production at our consumption rate.
            // `ideal` is only a hint — Safari will happily produce at the
            // sensor's native 30fps regardless, and the unread frames pool
            // up inside the <video> element (~3MB each at 720p YUV). That
            // accumulates Page memory at ~30MB/s and was the dominant
            // source of the iOS tab crash and macOS Safari frame-rate
            // degradation. `max` is a hard upper bound the browser must
            // respect.
            frameRate: { max: this.fastestFrameRate() },
        };

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
            this.stream = null;
            if (!this.stopped) for (const c of this.consumers) c.onDenied?.();
            return;
        }
        navigator.mediaDevices
            .getUserMedia({ audio: false, video: attempts[index] })
            .then((stream) => this.attachStream(stream))
            .catch(() => this.requestStream(attempts, index + 1));
    }

    /** Wire up a successfully-acquired MediaStream as our shared <video>. */
    private attachStream(stream: MediaStream) {
        if (this.stopped) {
            stream.getTracks().forEach((track) => track.stop());
            return;
        }
        const settings = stream.getVideoTracks()[0]?.getSettings();
        if (!settings || !settings.width || !settings.height) {
            this.stream = null;
            for (const c of this.consumers) c.onDenied?.();
            return;
        }

        const video = document.createElement('video');
        video.style.display = 'none';
        document.body.appendChild(video);
        video.srcObject = stream;

        this.stream = stream;
        this.video = video;
        // Consumers may have joined while getUserMedia was in flight; re-apply
        // the frameRate cap so it reflects the fastest of all of them.
        this.applyFrameRate();
        video.play().then(() => (this.playing = true));
    }

    private stop() {
        this.stopped = true;
        if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
        if (this.video) {
            this.video.srcObject = null;
            if (document.body.contains(this.video))
                document.body.removeChild(this.video);
        }
        this.video = undefined;
    }
}

/**
 * A per-consumer handle onto a shared `SharedSource`. Acquire one via
 * `acquireCameraSource`; call `release()` when done. When the last handle for a
 * device is released, its stream and `<video>` are torn down.
 */
export class CameraSourceHandle {
    private readonly key: string;
    private readonly consumer: Consumer;
    private source: SharedSource | undefined;

    constructor(key: string, source: SharedSource, consumer: Consumer) {
        this.key = key;
        this.source = source;
        this.consumer = consumer;
        source.add(consumer);
    }

    getVideoElement(): HTMLVideoElement | undefined {
        return this.source?.getVideoElement();
    }

    getSettings(): MediaTrackSettings | undefined {
        return this.source?.getSettings();
    }

    isReady(): boolean {
        return this.source?.isReady() ?? false;
    }

    isFailed(): boolean {
        return this.source?.isFailed() ?? false;
    }

    release() {
        if (this.source === undefined) return;
        if (this.source.remove(this.consumer)) sources.delete(this.key);
        this.source = undefined;
    }
}

/** Shared sources keyed by the selected camera device (or '' for the default). */
const sources = new Map<string, SharedSource>();

/**
 * Acquire a reference to the shared camera source for the currently-selected
 * device. Consumers requesting the same device share one stream and `<video>`;
 * each still samples into its own canvas at its own resolution via `CameraFeed`.
 */
export function acquireCameraSource(
    database: Database,
    idealFrequency: number,
    onDenied?: () => void,
): CameraSourceHandle {
    const key = database.Settings.getCamera() ?? '';
    let source = sources.get(key);
    if (source === undefined) {
        source = new SharedSource(database);
        sources.set(key, source);
    }
    return new CameraSourceHandle(key, source, { idealFrequency, onDenied });
}
