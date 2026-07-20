import type { Database } from '@db/Database';

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

class SharedAudioSource {
    private database: Database;
    /** undefined = not yet started, null = failed/denied. */
    private stream: MediaStream | undefined | null = undefined;
    private context: AudioContext | undefined;
    private sourceNode: MediaStreamAudioSourceNode | undefined;
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
    }

    /** Returns true when the source has no remaining consumers and was torn down. */
    remove(consumer: Consumer): boolean {
        this.consumers.delete(consumer);
        if (this.consumers.size === 0) {
            this.stop();
            return true;
        }
        return false;
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
            .getUserMedia({ audio: micID ? { deviceId: micID } : true })
            .then((stream) => this.attachStream(stream))
            .catch(() => {
                this.stream = null;
                if (!this.stopped) for (const c of this.consumers) c.onDenied?.();
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

    private stop() {
        this.stopped = true;
        if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
        if (this.sourceNode) this.sourceNode.disconnect();
        if (this.context) void this.context.close();
        this.context = undefined;
        this.sourceNode = undefined;
    }
}

/**
 * A per-consumer handle onto a shared `SharedAudioSource`. Acquire one via
 * `acquireAudioSource`; call `release()` when done. When the last handle for a
 * device is released, its stream and context are torn down.
 */
export class AudioSourceHandle {
    private readonly key: string;
    private readonly consumer: Consumer;
    private source: SharedAudioSource | undefined;

    constructor(key: string, source: SharedAudioSource, consumer: Consumer) {
        this.key = key;
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
        if (this.source.remove(this.consumer)) sources.delete(this.key);
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
    database: Database,
    onDenied?: () => void,
): AudioSourceHandle {
    const key = database.Settings.getMic() ?? '';
    let source = sources.get(key);
    if (source === undefined) {
        source = new SharedAudioSource(database);
        sources.set(key, source);
    }
    return new AudioSourceHandle(key, source, { onDenied });
}
