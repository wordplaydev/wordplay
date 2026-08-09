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
    'acousticGuitar',
    'electricGuitar',
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
    'pitchedDog',
    // Genuinely synthesized, and meant to sound like it.
    'synth',
    'synthBass',
    'synthPad',
    'voice',
] as const;

export type InstrumentKey = (typeof InstrumentKeys)[number];

export type InstrumentSpec = {
    /** The instrument's emoji name, when Unicode has one. */
    emoji: string | undefined;
    /** Whether degrees select pitches; unpitched instruments index a kit. */
    pitched: boolean;
    /** For unpitched instruments, what degree n strikes (1-indexed). */
    kit?: readonly string[];
    /** Whether this instrument sounds a track's `words`. Only the voice does,
     * and everything else ignores them — which is why the sheet draws a lyric
     * only under a track that will actually sing it. */
    sings?: boolean;
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

/** Whether an instrument sounds a track's `words`. */
export function sung(id: string): boolean {
    return instrumentSpec(id)?.sings ?? false;
}

/** Narrow an arbitrary id to a palette key, for callers that need the key
 *  itself rather than its spec — looking up an instrument's localized name,
 *  say. Ids arrive as plain text for the same reason `instrumentSpec` says. */
export function toInstrumentKey(id: string): InstrumentKey | undefined {
    return InstrumentKeys.find((key) => key === id);
}

export const Instruments: Record<InstrumentKey, InstrumentSpec> = {
    piano: { emoji: '🎹', pitched: true, hue: 260 },
    // Nylon-strung and classical; the plain guitar emoji, since this is what
    // "guitar" means to most people and old projects saying `guitar` land here.
    acousticGuitar: { emoji: '🎸', pitched: true, hue: 20 },
    // Unicode has one guitar and it is this shape, so the electric takes a
    // lightning bolt instead — the thing that makes it electric.
    electricGuitar: { emoji: '⚡', pitched: true, hue: 5 },
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
    // Five dogs' worth of barks, dark to bright: a Rottweiler's chest-deep
    // woof at one end and a small sharp yap at the other.
    dog: {
        emoji: '🐶',
        pitched: false,
        kit: [
            'gruff',
            'warning',
            'guarding',
            'alert',
            'insisting',
            'demanding',
            'announcing',
            'eager',
            'excited',
            'impatient',
            'yapping',
            'shrill',
        ],
        hue: 35,
    },
    // The one bark of the sixty that holds a pitch, transposed to whatever
    // note is asked for. Its hue sits clear of the kit dog's rather than
    // beside it: everything around 35° is already taken.
    pitchedDog: { emoji: '🐕', pitched: true, hue: 125 },
    synth: { emoji: '🎛️', pitched: true, hue: 290 },
    // A fader, from the same Unicode family as synth's knobs, so the two
    // read as siblings.
    synthBass: { emoji: '🎚️', pitched: true, hue: 310 },
    // A pad is a soft sustained wash rather than another control surface.
    synthPad: { emoji: '☁️', pitched: true, hue: 200 },
    // A vocal tract built out of filters, and a synthesizer by the same test
    // as the three above: it is not standing in for a singer we failed to
    // record. Its formants never move with pitch, which no throat can manage,
    // so it sings without ever being mistaken for a person — and without
    // sounding like a man or a woman at any note.
    //
    // A robot, because that is what it sounds like: a machine doing an
    // impression of a person, which is the design rather than a shortfall of
    // it. A speaking head would have been the obvious pick and belongs to
    // `Chat`; a mouth is red lips in most fonts, which is a gender cue on the
    // one instrument that must not carry one.
    voice: { emoji: '🤖', pitched: true, sings: true, hue: 95 },
};
