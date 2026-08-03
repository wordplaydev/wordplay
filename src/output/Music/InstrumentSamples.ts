/**
 * Fetching and decoding the sampled instruments, shaped like
 * `src/basis/faces/Fonts.ts`: a module singleton that loads lazily, remembers
 * what it has, and is safe to ask repeatedly.
 *
 * The player never waits on this. Every instrument has a synthesized recipe
 * that plays immediately, so a note sounds before the network answers, works
 * offline, and works on the first beat of a piece; when a zone finishes
 * decoding, later notes use it instead. That is the whole reason the design
 * ships both rather than choosing.
 */

import { Zones, type Zone } from '@output/Music/samples.generated';

/** Where the build writes the mp3s; served straight out of `static`. */
const Base = '/instruments/';

type Loaded = {
    zone: Zone;
    buffer: AudioBuffer;
};

class InstrumentSamples {
    /** Decoded zones per instrument, once they arrive. */
    private readonly loaded = new Map<string, Loaded[]>();
    /** Instruments whose fetch is in flight or finished, so we ask once. */
    private readonly requested = new Set<string>();

    /** Whether an instrument has recordings at all. */
    has(instrument: string): boolean {
        return Zones[instrument] !== undefined;
    }

    /**
     * The best zone for a note, or undefined if nothing has loaded yet —
     * which is the caller's cue to synthesize. Asking also starts the load,
     * so the first note of a piece is synthesized and later ones are sampled.
     */
    zoneFor(instrument: string, semitones: number): Loaded | undefined {
        this.request(instrument);
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
        this.request(instrument);
        const zones = this.loaded.get(instrument);
        const all = Zones[instrument];
        if (zones === undefined || all === undefined || all.length === 0)
            return undefined;
        const wanted = all[((index % all.length) + all.length) % all.length];
        return zones.find((loaded) => loaded.zone.file === wanted.file);
    }

    /** Begin loading an instrument's zones, at most once. */
    request(instrument: string) {
        if (this.requested.has(instrument)) return;
        const zones = Zones[instrument];
        if (zones === undefined) return;
        this.requested.add(instrument);
        void this.load(instrument, zones);
    }

    private async load(instrument: string, zones: Zone[]) {
        const context = getDecodeContext();
        if (context === undefined) return;
        for (const zone of zones) {
            try {
                const response = await fetch(Base + zone.file);
                if (!response.ok) continue;
                const bytes = await response.arrayBuffer();
                const buffer = await context.decodeAudioData(bytes);
                const list = this.loaded.get(instrument) ?? [];
                list.push({ zone, buffer });
                this.loaded.set(instrument, list);
            } catch {
                // A zone that won't load just isn't available; the synth
                // recipe covers it, so there is nothing to report and nothing
                // to retry.
            }
        }
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
}

function getDecodeContext(): AudioContext | undefined {
    return decodeContext;
}

const samples = new InstrumentSamples();

export default samples;
