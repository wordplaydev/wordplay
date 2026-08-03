/**
 * Synthesis recipes, as pure data. Every instrument ships a recipe, because
 * synthesis needs no assets: it plays immediately, works offline, works
 * before the network answers, and is what a sampled instrument falls back to
 * while its zones load. Recipes stay deliberately plain — an oscillator, an
 * envelope, a filter, or a noise burst — since the design's position is that
 * synthesis is right for a generic bell or plucked string and is never a way
 * to claim coverage of an instrument we haven't recorded.
 */

import { InstrumentKeys, type InstrumentKey } from '@output/Music/instruments';
import { instrumentSpec } from '@output/Music/instruments';

export type Envelope = {
    /** Seconds to reach full gain. */
    attack: number;
    /** Seconds to fall to the sustain level. */
    decay: number;
    /** 0-1 fraction of peak held while the note lasts. */
    sustain: number;
    /** Seconds to fall silent after the note ends. */
    release: number;
};

export type SynthRecipe = {
    /** A tone, or filtered noise for percussion and ambience. */
    source: 'sine' | 'triangle' | 'sawtooth' | 'square' | 'noise';
    envelope: Envelope;
    /** Low-pass cutoff in Hz; undefined leaves the tone unfiltered. */
    cutoff: number | undefined;
    /** Peak gain, roughly loudness-matched across the palette. */
    gain: number;
};

/** A short percussive hit: fast attack, no sustain. */
function hit(
    source: SynthRecipe['source'],
    decay: number,
    cutoff: number | undefined,
    gain: number,
): SynthRecipe {
    return {
        source,
        envelope: { attack: 0.002, decay, sustain: 0, release: 0.02 },
        cutoff,
        gain,
    };
}

/** A sustained tone that holds while the note lasts. */
function tone(
    source: SynthRecipe['source'],
    attack: number,
    cutoff: number | undefined,
    gain: number,
): SynthRecipe {
    return {
        source,
        envelope: { attack, decay: 0.08, sustain: 0.75, release: 0.12 },
        cutoff,
        gain,
    };
}

/** A plucked or struck tone that rings and fades on its own. */
function pluck(
    source: SynthRecipe['source'],
    decay: number,
    cutoff: number | undefined,
    gain: number,
): SynthRecipe {
    return {
        source,
        envelope: { attack: 0.004, decay, sustain: 0.12, release: 0.25 },
        cutoff,
        gain,
    };
}

/**
 * Peak gains, **measured rather than chosen**.
 *
 * A sampled zone is normalized to -26 LUFS and played at `SampleGain`, so it
 * lands at about -33.5 LUFS. A raw oscillator at the gains these recipes
 * originally carried landed between -13 and -31 — up to 21 dB louder, which
 * meant an instrument leapt in volume the moment its recording finished
 * loading, and a synthesized bass buried a sampled melody. Each gain here was
 * derived by rendering the recipe with its own envelope and filter, measuring
 * its integrated loudness, and solving for the level that matches a sample.
 */
export const Recipes: Record<InstrumentKey, SynthRecipe> = {
    piano: pluck('triangle', 0.5, 3200, 0.107),
    guitar: pluck('sawtooth', 0.45, 2200, 0.125),
    violin: tone('sawtooth', 0.09, 2600, 0.058),
    drums: hit('noise', 0.16, 4000, 0.193),
    flute: tone('sine', 0.06, 3000, 0.047),
    trumpet: tone('square', 0.05, 2800, 0.033),
    saxophone: tone('sawtooth', 0.06, 2000, 0.059),
    bell: pluck('sine', 1.2, 5000, 0.055),
    didgeridoo: tone('sawtooth', 0.08, 700, 0.068),
    cat: tone('sawtooth', 0.05, 2400, 0.058),
    // The same voice as the kit cat, since it is the same cat.
    pitchedCat: tone('sawtooth', 0.05, 2400, 0.058),
    dog: hit('noise', 0.22, 1200, 0.333),
    // The same voice as the kit dog, since it is the same dogs.
    pitchedDog: hit('noise', 0.22, 1200, 0.333),
    // The synthesizers, which are supposed to sound synthesized: a bright
    // detuned lead, a fat low square, and a slow-swelling pad.
    synth: {
        source: 'sawtooth',
        envelope: { attack: 0.01, decay: 0.12, sustain: 0.7, release: 0.18 },
        cutoff: 4200,
        gain: 0.059,
    },
    synthBass: {
        source: 'square',
        envelope: { attack: 0.005, decay: 0.1, sustain: 0.8, release: 0.12 },
        cutoff: 800,
        gain: 0.034,
    },
    synthPad: {
        source: 'triangle',
        envelope: { attack: 0.35, decay: 0.2, sustain: 0.85, release: 0.6 },
        cutoff: 2400,
        gain: 0.05,
    },
};

/** The recipe for an instrument id, falling back to a plain tone for an id
 * outside the palette (only reachable by constructing `Instrument` directly
 * rather than using a static). */
export function recipeFor(id: string): SynthRecipe {
    for (const key of InstrumentKeys) if (key === id) return Recipes[key];
    return tone('triangle', 0.02, 3000, 0.35);
}

/** Whether degrees index a kit rather than choosing pitches. */
export function isPitched(id: string): boolean {
    return instrumentSpec(id)?.pitched ?? true;
}

/** Which kit piece a degree strikes, wrapping around the kit. */
export function kitIndex(id: string, degree: number): number {
    const size = instrumentSpec(id)?.kit?.length ?? 1;
    return (((Math.round(degree) - 1) % size) + size) % size;
}

/**
 * How far to shift the *synthesized* noise burst for a kit piece, so 1, 2,
 * and 3 are audibly different strikes rather than the same sound. This is a
 * timbre trick for the synth fallback only: where real recordings exist the
 * degree picks a recording (see `kitZoneFor`), and resampling one kit piece
 * to stand in for another would turn a bass drum into a cowbell.
 */
export function kitSemitones(id: string, degree: number): number {
    // Spread the kit over a couple of octaves of pitch offset.
    return kitIndex(id, degree) * 7 - 12;
}
