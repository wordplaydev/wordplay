/**
 * The genuinely-shared, expensive half of microphone access: one `MediaStream`
 * and one shared `AudioContext`, reference-counted and keyed by the selected
 * microphone device. Multiple consumers of the same device (e.g. the `Volume`
 * and `Pitch` streams running in one project) share a single `getUserMedia`
 * session and a single `AudioContext` instead of each opening their own.
 *
 * Per-consumer analysis (AnalyserNode creation, fft-size tuning) stays in the
 * stream itself — each `Volume`/`Pitch` instance builds its own AnalyserNode
 * and connects it to the shared source, mirroring how `CameraFeed` builds its
 * own canvas for per-consumer sampling.
 */

/** A live consumer of a shared source; driven by denial callback. */
type Consumer = {
    onDenied: (() => void) | undefined;
};

/** The one slice of the database this module reads, structural so tests can
 * pass a stub instead of constructing Firebase-backed state. */
type MicSettings = { Settings: { getMic(): string | null } };

/**
 * How long a zero-consumer source stays warm. Evaluator rebuilds (edits,
 * locale changes, replays) release and reacquire within a frame, but each
 * fresh `getUserMedia` can re-show an OS-level permission dialog on Android
 * Chrome — so tearing down eagerly re-prompted on every rebuild. A few
 * seconds collapses every rebuild path into one acquisition while keeping
 * the browser's recording indicator honest once a project really closes.
 */
const SourceGraceMs = 5000;

class SharedAudioSource {
    private database: MicSettings;
    /** The `sources` map key this source registered under, for self-removal. */
    private readonly key: string;
    /** undefined = not yet started, null = failed/denied. */
    private stream: MediaStream | undefined | null = undefined;
    private context: AudioContext | undefined;
    private sourceNode: MediaStreamAudioSourceNode | undefined;
    private stopped = false;
    /** True once start() has kicked off acquisition, so it only runs once. */
    private started = false;
    /** Pending deferred teardown, while the source idles with no consumers. */
    private teardown: ReturnType<typeof setTimeout> | undefined = undefined;
    private readonly consumers = new Set<Consumer>();

    constructor(database: MicSettings, key: string) {
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
    }

    remove(consumer: Consumer): void {
        this.consumers.delete(consumer);
        if (this.consumers.size > 0) return;
        // A denied source holds nothing live; retire now so the next acquire
        // can ask again rather than caching the denial.
        if (this.stream === null) this.retire();
        else this.teardown = setTimeout(() => this.retire(), SourceGraceMs);
    }

    /** True when nothing is consuming this source (teardown pending or not). */
    isIdle(): boolean {
        return this.consumers.size === 0;
    }

    getSourceNode(): MediaStreamAudioSourceNode | undefined {
        return this.sourceNode;
    }

    getContext(): AudioContext | undefined {
        return this.context;
    }

    isReady(): boolean {
        return this.stream != null && this.context !== undefined;
    }

    isFailed(): boolean {
        return this.stream === null;
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

        const micID = this.database.Settings.getMic();

        navigator.mediaDevices
            // Automatic gain control normalizes loudness away, which is exactly
            // what Volume and Pitch are here to report — it ramps a silent room
            // up until its noise reads as sound. Requested as a plain value, not
            // `{ exact: false }`, so a browser without it ignores the request
            // instead of failing acquisition.
            .getUserMedia({
                audio: {
                    ...(micID ? { deviceId: micID } : {}),
                    autoGainControl: false,
                },
            })
            .then((stream) => this.attachStream(stream))
            .catch(() => {
                this.stream = null;
                if (!this.stopped)
                    for (const c of this.consumers) c.onDenied?.();
            });
    }

    /** Wire up a successfully-acquired MediaStream as our shared source. */
    private attachStream(stream: MediaStream) {
        if (this.stopped) {
            stream.getTracks().forEach((track) => track.stop());
            return;
        }

        this.stream = stream;
        this.context = new AudioContext();
        this.sourceNode = this.context.createMediaStreamSource(stream);
    }

    retire() {
        if (this.stopped) return;
        this.stopped = true;
        if (this.teardown !== undefined) clearTimeout(this.teardown);
        this.teardown = undefined;
        if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
        if (this.sourceNode) this.sourceNode.disconnect();
        if (this.context) void this.context.close();
        this.context = undefined;
        this.sourceNode = undefined;
        sources.delete(this.key);
    }
}

/**
 * A per-consumer handle onto a shared `SharedAudioSource`. Acquire one via
 * `acquireAudioSource`; call `release()` when done. When the last handle for a
 * device is released, its stream and context linger briefly for reuse, then
 * tear down.
 */
export class AudioSourceHandle {
    private readonly consumer: Consumer;
    private source: SharedAudioSource | undefined;

    constructor(source: SharedAudioSource, consumer: Consumer) {
        this.source = source;
        this.consumer = consumer;
        source.add(consumer);
    }

    getSourceNode(): MediaStreamAudioSourceNode | undefined {
        return this.source?.getSourceNode();
    }

    getContext(): AudioContext | undefined {
        return this.source?.getContext();
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

/** Shared sources keyed by the selected microphone device (or '' for the default). */
const sources = new Map<string, SharedAudioSource>();

/**
 * Acquire a reference to the shared audio source for the currently-selected
 * device. Consumers requesting the same device share one stream and
 * AudioContext; each still builds its own AnalyserNode and connects it to the
 * source at the frequency/fft-size it needs.
 */
export function acquireAudioSource(
    database: MicSettings,
    onDenied?: () => void,
): AudioSourceHandle {
    const key = database.Settings.getMic() ?? '';
    // A device switch shouldn't hold the old microphone open for the grace
    // period; retire any idling source for a different device now.
    for (const [otherKey, other] of sources)
        if (otherKey !== key && other.isIdle()) other.retire();
    let source = sources.get(key);
    if (source === undefined) {
        source = new SharedAudioSource(database, key);
        sources.set(key, source);
    }
    return new AudioSourceHandle(source, { onDenied });
}
