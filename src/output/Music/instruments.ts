/**
 * The fixed instrument palette. The `Instrument` structure carries only an
 * opaque id; everything the player and the visualizations need to know about
 * an instrument — whether it is pitched, how degrees index a kit, its stable
 * visualization hue, and (in later phases) its synthesis recipe and sample
 * zones — lives here, keyed by that id. Keys are the en-US names; localized
 * names live in each locale's `output.Instrument.instruments`.
 */
export const InstrumentKeys = [
    'piano',
    'guitar',
    'violin',
    'drums',
    'flute',
    'trumpet',
    'saxophone',
    'bell',
    'djembe',
    'sitar',
    'erhu',
    'oud',
    'panFlute',
    'nativeAmericanFlute',
    'didgeridoo',
    'bagpipes',
    'cat',
    'dog',
    'water',
    'nature',
    'city',
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
    djembe: { emoji: '🪘', pitched: false, kit: ['bass', 'tone', 'slap'], hue: 25 },
    sitar: { emoji: undefined, pitched: true, hue: 300 },
    erhu: { emoji: undefined, pitched: true, hue: 350 },
    oud: { emoji: undefined, pitched: true, hue: 30 },
    panFlute: { emoji: undefined, pitched: true, hue: 160 },
    nativeAmericanFlute: { emoji: undefined, pitched: true, hue: 140 },
    didgeridoo: { emoji: undefined, pitched: true, hue: 15 },
    bagpipes: { emoji: undefined, pitched: true, hue: 120 },
    cat: { emoji: '🐱', pitched: false, kit: ['meow'], hue: 330 },
    dog: { emoji: '🐶', pitched: false, kit: ['bark'], hue: 35 },
    water: { emoji: '🌊', pitched: false, kit: ['rushing'], hue: 210 },
    nature: { emoji: '🍃', pitched: false, kit: ['birds', 'wind', 'waterfall'], hue: 100 },
    city: { emoji: '🏙️', pitched: false, kit: ['ambience'], hue: 230 },
};
