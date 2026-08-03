/**
 * The fixed instrument palette. The `Instrument` structure carries only an
 * opaque id; everything the player and the visualizations need to know about
 * an instrument — whether it is pitched, how degrees index a kit, its stable
 * visualization hue — lives here, keyed by that id. Keys are the en-US names;
 * localized names live in each locale's `output.Instrument.instruments`.
 *
 * **Every entry either has real recordings or is honestly a synthesizer.**
 * An earlier palette listed instruments we had no samples for — sitar, erhu,
 * oud, pan flute, Native American flute, djembe, bagpipes — on the theory
 * that a synthesized approximation was better than nothing. It wasn't: an
 * oscillator standing in for an instrument that carries a tradition sounds
 * like a caricature of it, which is worse than not offering it. They are gone
 * until a real CC0 recording is curated for each.
 *
 * The synthesizers that remain are not stand-ins for anything. A synth lead,
 * bass, and pad are their own instruments, and an oscillator is exactly the
 * right way to make them.
 */
export const InstrumentKeys = [
    // Sampled from CC0 libraries; see scripts/instruments/manifest.ts.
    'piano',
    'guitar',
    'violin',
    'drums',
    'flute',
    'trumpet',
    'saxophone',
    'bell',
    'didgeridoo',
    'cat',
    'pitchedCat',
    'dog',
    // Genuinely synthesized, and meant to sound like it.
    'synth',
    'synthBass',
    'synthPad',
] as const;

export type InstrumentKey = (typeof InstrumentKeys)[number];

export type InstrumentSpec = {
    /** The instrument's emoji name, when Unicode has one. */
    emoji: string | undefined;
    /** Whether degrees select pitches; unpitched instruments index a kit. */
    pitched: boolean;
    /** For unpitched instruments, what degree n strikes (1-indexed). */
    kit?: readonly string[];
    /** The stable visualization hue (degrees), one per instrument across every project. */
    hue: number;
};

/** Look up a palette entry by id. Ids arrive as plain text (an `Instrument`
 * can be constructed directly rather than through a static), so this narrows
 * rather than assuming. */
export function instrumentSpec(id: string): InstrumentSpec | undefined {
    for (const key of InstrumentKeys) if (key === id) return Instruments[key];
    return undefined;
}

export const Instruments: Record<InstrumentKey, InstrumentSpec> = {
    piano: { emoji: '🎹', pitched: true, hue: 260 },
    guitar: { emoji: '🎸', pitched: true, hue: 20 },
    violin: { emoji: '🎻', pitched: true, hue: 40 },
    drums: {
        emoji: '🥁',
        pitched: false,
        kit: ['bass', 'snare', 'hihat', 'cymbal', 'tomtom', 'cowbell'],
        hue: 0,
    },
    flute: { emoji: '🪈', pitched: true, hue: 180 },
    trumpet: { emoji: '🎺', pitched: true, hue: 50 },
    saxophone: { emoji: '🎷', pitched: true, hue: 70 },
    bell: { emoji: '🔔', pitched: true, hue: 55 },
    // A hollowed wooden tube; Unicode has no didgeridoo, and a horn would
    // read as brass, which this is not.
    didgeridoo: { emoji: '🪵', pitched: true, hue: 15 },
    // A whole kit of one cat asking for things, dark to bright.
    cat: {
        emoji: '🐱',
        pitched: false,
        kit: [
            'irritated',
            'begging',
            'hungry',
            'protesting',
            'pleading',
            'wishful',
            'bothered',
            'scared',
            'sensitive',
            'comforted',
            'lonely',
            'purr',
        ],
        hue: 330,
    },
    // The same cat, tuned: one drawn-out meow that happens to sit almost
    // exactly on concert G, transposed to whatever note is asked for. A hue
    // beside the kit cat's, the way synthBass sits beside synth.
    pitchedCat: { emoji: '😺', pitched: true, hue: 350 },
    dog: { emoji: '🐶', pitched: false, kit: ['bark'], hue: 35 },
    synth: { emoji: '🎛️', pitched: true, hue: 290 },
    // A fader, from the same Unicode family as synth's knobs, so the two
    // read as siblings.
    synthBass: { emoji: '🎚️', pitched: true, hue: 310 },
    // A pad is a soft sustained wash rather than another control surface.
    synthPad: { emoji: '☁️', pitched: true, hue: 200 },
};
