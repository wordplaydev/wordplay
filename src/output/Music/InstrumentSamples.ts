/**
 * Fetching and decoding the sampled instruments, shaped like
 * `src/basis/faces/Fonts.ts`: a module singleton that loads lazily, remembers
 * what it has, and is safe to ask repeatedly.
 *
 * The player waits for these. A sampled instrument is meant to sound like its
 * recording, and it used to synthesize whatever hadn't arrived — so a piece
 * opened with a placeholder timbre, then switched, and the note already handed
 * to the audio clock could never be re-rendered. Synthesis is now the fallback
 * for one case only: a recording that *failed* to load, where the alternative
 * is silence. The three synthesizer instruments have no recordings at all and
 * are always ready.
 *
 * Fetching and decoding are separate on purpose. Bytes need nothing but the
 * network, while `decodeAudioData` needs an AudioContext, and the player's is
 * created lazily inside a gesture — pressing play. Splitting them is what lets
 * a project start loading when it opens rather than when it sounds.
 */

import { Zones, type Zone } from '@output/Music/samples.generated';

/** Where the build writes the mp3s; served straight out of `static`. */
const Base = '/instruments/';

type Loaded = {
    zone: Zone;
    buffer: AudioBuffer;
};

/**
 * Where an instrument's recordings have got to.
 *
 * `failed` is a real state rather than an absence: it's what tells the player
 * to give up waiting and synthesize instead, which is exactly the distinction
 * a bare `undefined` couldn't make.
 *
 * `fetched` separates the two halves of the wait, and it exists because they
 * end at different times. Bytes stop arriving when the network is done;
 * decoding can't even begin until an `AudioContext` exists, and the player's
 * is created inside a gesture — so an instrument that has fully downloaded sits
 * here indefinitely for a project nobody has pressed play on. Reported as
 * "loading", that was a spinner over an open project that never went away —
 * which is also the wrong thing to say, since nothing is being waited for but
 * the creator.
 */
export type SampleState = 'fetching' | 'fetched' | 'ready' | 'failed';

class InstrumentSamples {
    /** Decoded zones per instrument, once they arrive. */
    private readonly loaded = new Map<string, Loaded[]>();
    /** Fetched bytes waiting for a context to decode them. */
    private readonly fetched = new Map<
        string,
        { zone: Zone; bytes: ArrayBuffer }[]
    >();
    /** How far along each instrument is. Absent means never asked for. */
    private readonly state = new Map<string, SampleState>();
    /** Called whenever a state changes, so the UI can say what's happening. */
    private readonly listeners = new Set<() => void>();

    /** Whether an instrument has recordings at all. */
    has(instrument: string): boolean {
        return Zones[instrument] !== undefined;
    }

    /**
     * Whether the player can start a piece using this instrument.
     *
     * True for the synthesizers, which have nothing to wait for, and for a
     * failed load, where waiting longer would only mean silence.
     */
    ready(instrument: string): boolean {
        if (!this.has(instrument)) return true;
        const state = this.state.get(instrument);
        return state === 'ready' || state === 'failed';
    }

    /** Whether this instrument will sound synthesized because it couldn't load. */
    failed(instrument: string): boolean {
        return this.state.get(instrument) === 'failed';
    }

    /**
     * The instruments still coming over the network, for the stage's loading
     * indicator. Not the ones that have arrived and are waiting for a context
     * to decode with — that wait is over the moment the creator presses play,
     * so showing it says "still working" about something that isn't.
     */
    loading(): string[] {
        return this.inState('fetching');
    }

    /** The instruments that will sound synthesized because their files failed. */
    failedInstruments(): string[] {
        return this.inState('failed');
    }

    private inState(wanted: SampleState): string[] {
        return [...this.state.entries()]
            .filter(([, state]) => state === wanted)
            .map(([instrument]) => instrument);
    }

    /** Subscribe to state changes; returns an unsubscribe. */
    observe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private announce(instrument: string, state: SampleState) {
        this.state.set(instrument, state);
        for (const listener of this.listeners) listener();
    }

    /**
     * The best zone for a note, or undefined when there's nothing to play it
     * with — which now only happens for a synthesis-only or failed instrument,
     * since the player waits for the rest.
     */
    zoneFor(instrument: string, semitones: number): Loaded | undefined {
        const zones = this.loaded.get(instrument);
        if (zones === undefined || zones.length === 0) return undefined;
        // Nearest root: resampling more than a few semitones makes a sample
        // audibly shorter and thinner rather than simply higher.
        const midi = 60 + semitones;
        let best = zones[0];
        for (const candidate of zones)
            if (
                Math.abs(candidate.zone.root - midi) <
                Math.abs(best.zone.root - midi)
            )
                best = candidate;
        return best;
    }

    /**
     * The zone for a kit piece, chosen by index and never transposed.
     *
     * Percussion zones are one recording per piece, so the degree selects
     * *which* recording rather than how far to shift one — picking by nearest
     * root the way pitched instruments do would resample a bass drum into a
     * cowbell, since the roots are arbitrary labels rather than a scale.
     * Zones are ordered by root, matching the `kit` array in `instruments.ts`.
     */
    kitZoneFor(instrument: string, index: number): Loaded | undefined {
        const zones = this.loaded.get(instrument);
        const all = Zones[instrument];
        if (zones === undefined || all === undefined || all.length === 0)
            return undefined;
        const wanted = all[((index % all.length) + all.length) % all.length];
        return zones.find((loaded) => loaded.zone.file === wanted.file);
    }

    /**
     * Begin loading an instrument's recordings, at most once.
     *
     * Safe to call before any AudioContext exists — that's the point. The
     * bytes are fetched now and decoded by `decode()` when a context arrives.
     */
    request(instrument: string) {
        if (this.state.has(instrument)) return;
        const zones = Zones[instrument];
        if (zones === undefined) return;
        this.announce(instrument, 'fetching');
        void this.load(instrument, zones);
    }

    private async load(instrument: string, zones: Zone[]) {
        // In parallel: these are separate small files, and fetching them one
        // after another made an instrument's wait the sum of every round trip
        // rather than the longest one.
        const results = await Promise.all(
            zones.map(async (zone) => {
                try {
                    const response = await fetch(Base + zone.file);
                    if (!response.ok) return undefined;
                    return { zone, bytes: await response.arrayBuffer() };
                } catch {
                    return undefined;
                }
            }),
        );
        const arrived = results.filter((r) => r !== undefined);
        // Nothing arrived at all — offline, or the files aren't there. Say
        // failed so the player stops waiting and synthesizes instead.
        if (arrived.length === 0) {
            this.announce(instrument, 'failed');
            return;
        }
        this.fetched.set(instrument, arrived);
        await this.decodeFetched(instrument);
    }

    /** Decode whatever has been fetched, if a context exists to decode with. */
    private async decodeFetched(instrument: string) {
        const context = getDecodeContext();
        // No context yet: the bytes wait in `fetched`, and `decodePending`
        // picks them up when the player makes one. Still not playable, so not
        // `ready` — but nothing is in flight either, so not `fetching`.
        if (context === undefined) {
            if (this.state.get(instrument) === 'fetching')
                this.announce(instrument, 'fetched');
            return;
        }
        const pending = this.fetched.get(instrument);
        if (pending === undefined) return;
        this.fetched.delete(instrument);
        const decoded: Loaded[] = [];
        for (const { zone, bytes } of pending) {
            try {
                decoded.push({
                    zone,
                    buffer: await context.decodeAudioData(bytes),
                });
            } catch {
                // A zone that won't decode simply isn't among the choices.
            }
        }
        if (decoded.length === 0) {
            this.announce(instrument, 'failed');
            return;
        }
        this.loaded.set(instrument, decoded);
        this.announce(instrument, 'ready');
    }

    /** Decode everything fetched before a context existed. Called by MusicAudio. */
    decodePending() {
        for (const instrument of [...this.fetched.keys()])
            void this.decodeFetched(instrument);
    }
}

/**
 * `decodeAudioData` needs a context, and the player's own is created lazily
 * inside a gesture. This is set by `MusicAudio` once it has one, rather than
 * creating a second context here — browsers cap how many exist.
 */
let decodeContext: AudioContext | undefined = undefined;

export function setDecodeContext(context: AudioContext) {
    decodeContext = context;
    // Anything fetched while there was no context can be decoded now.
    samples.decodePending();
}

function getDecodeContext(): AudioContext | undefined {
    return decodeContext;
}

const samples = new InstrumentSamples();

export default samples;
