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

/**
 * How long a zero-consumer source stays warm. Evaluator rebuilds release and
 * reacquire within a frame, but each fresh `getUserMedia` can re-show an
 * OS-level permission dialog on Android Chrome — so tearing down eagerly
 * re-prompted on every rebuild. Mirrors `AudioSource`'s grace period.
 */
const SourceGraceMs = 5000;

class SharedSource {
    private database: Database;
    /** The `sources` map key this source registered under, for self-removal. */
    private readonly key: string;
    /** undefined = not yet started, null = failed/denied. */
    private stream: MediaStream | undefined | null = undefined;
    private video: HTMLVideoElement | undefined;
    private playing = false;
    private stopped = false;
    /** True once start() has kicked off acquisition, so it only runs once. */
    private started = false;
    /** Pending deferred teardown, while the source idles with no consumers. */
    private teardown: ReturnType<typeof setTimeout> | undefined = undefined;
    private readonly consumers = new Set<Consumer>();

    constructor(database: Database, key: string) {
        this.database = database;
        this.key = key;
    }

    add(consumer: Consumer) {
        if (this.teardown !== undefined) {
            clearTimeout(this.teardown);
            this.teardown = undefined;
        }
        this.consumers.add(consumer);
        if (!this.started) this.start();
        else if (this.stream === null) consumer.onDenied?.();
        else this.applyFrameRate();
    }

    remove(consumer: Consumer): void {
        this.consumers.delete(consumer);
        if (this.consumers.size === 0) {
            // A denied source holds nothing live; retire now so the next
            // acquire can ask again rather than caching the denial.
            if (this.stream === null) this.retire();
            else this.teardown = setTimeout(() => this.retire(), SourceGraceMs);
            return;
        }
        this.applyFrameRate();
    }

    /** True when nothing is consuming this source (teardown pending or not). */
    isIdle(): boolean {
        return this.consumers.size === 0;
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

    retire() {
        if (this.stopped) return;
        this.stopped = true;
        if (this.teardown !== undefined) clearTimeout(this.teardown);
        this.teardown = undefined;
        if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
        if (this.video) {
            this.video.srcObject = null;
            if (document.body.contains(this.video))
                document.body.removeChild(this.video);
        }
        this.video = undefined;
        sources.delete(this.key);
    }
}

/**
 * A per-consumer handle onto a shared `SharedSource`. Acquire one via
 * `acquireCameraSource`; call `release()` when done. When the last handle for
 * a device is released, its stream and `<video>` linger briefly for reuse,
 * then tear down.
 */
export class CameraSourceHandle {
    private readonly consumer: Consumer;
    private source: SharedSource | undefined;

    constructor(source: SharedSource, consumer: Consumer) {
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
        this.source.remove(this.consumer);
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
    // A device switch shouldn't hold the old camera open for the grace
    // period; retire any idling source for a different device now.
    for (const [otherKey, other] of sources)
        if (otherKey !== key && other.isIdle()) other.retire();
    let source = sources.get(key);
    if (source === undefined) {
        source = new SharedSource(database, key);
        sources.set(key, source);
    }
    return new CameraSourceHandle(source, { idealFrequency, onDenied });
}
