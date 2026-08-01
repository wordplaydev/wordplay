/**
 * The curated zones: which recording covers which part of which instrument's
 * range. Hand-authored, because curation is a listening job — the pipeline
 * makes it reproducible, not automatic.
 *
 * A **zone** is one recording plus its root pitch and the range it covers. To
 * play a note the player picks the nearest-rooted zone and resamples it, so
 * an instrument needs as many zones as its timbre changes across its range:
 * inside roughly ±3 semitones nobody notices, past that a sample played fast
 * is audibly shorter and thinner rather than simply higher. Zones are
 * therefore spaced ~6 semitones for instruments whose colour moves (piano,
 * saxophone), and percussion gets exactly one and is never transposed.
 *
 * Choices worth stating:
 *
 * - **No velocity layers.** Our `volume` is a gain multiplier, so where a
 *   library offers several dynamics we take one mid layer (`vl3`, `f`) and
 *   let loudness normalization do the rest. VCSL itself deprioritises
 *   velocity layers, so there would be little to switch between.
 * - **Dry, close sources.** There is no effects graph, so there is no reverb
 *   to unify rooms; a hall-recorded sample beside a dry one can't be fixed at
 *   playback and has to be avoided at selection time. Hence the piano's
 *   `Close` mic and the saxophone's `Main`.
 * - **No sustain pedal** on the piano (`NoSus`), since a pedalled note's tail
 *   is a different instrument once you cut it to length.
 */

import { Sources } from './sources';

export type ZoneSpec = {
    /** Which source library. */
    source: keyof typeof Sources;
    /** Path within that library. */
    path: string;
    /**
     * The note the recording was played at, as the library labels it, or
     * `detect` to take the measured fundamental as the root — for a drone
     * with no written pitch.
     */
    root: string | 'detect';
};

/**
 * A VSCO instrument, resolved at build time. Its XRNI carries an
 * `Instrument.xml` whose `BaseNote` is the authoritative root — and VSCO's
 * *filenames* use an octave numbering one below MIDI's (a sample called `a3`
 * has BaseNote 69, which is A4), so picking zones by filename would be
 * guesswork. The manifest declares the spacing it wants and the build records
 * which samples that resolved to.
 */
export type PackSpec = {
    source: 'vsco';
    /** The XRNI entry in the VSCO archive. */
    entry: string;
    /** Roughly how many semitones apart the chosen zones should be. */
    spacing: number;
};

export type InstrumentSpec = {
    /** Palette id, matching `src/output/Music/instruments.ts`. */
    id: string;
    /** Longest note we keep, in seconds. */
    maxSeconds: number;
    /** Explicitly chosen zones, in ascending root order. */
    zones?: ZoneSpec[];
    /** Or a pack to resolve zones from. */
    pack?: PackSpec;
    /** False for percussion, whose degrees index a kit rather than choosing
     * pitches — there is no fundamental to measure or correct. */
    pitched?: boolean;
    /** True where the spectrum has no energy at the nominal fundamental, so
     * there is nothing to measure a tuning offset against. */
    inharmonic?: boolean;
};

const PianoDir = 'Chordophones/Zithers/Grand Piano, Steinway B/NoSus/';
const SaxDir = 'Aerophones/Reed Aerophones/Tenor Saxophone/Non-Vibrato/';
const BellDir = 'Idiophones/Struck Idiophones/Tubular Bells 1/';

/** A VCSL zone. */
function vcsl(path: string, root: string): ZoneSpec {
    return { source: 'vcsl', path, root };
}

export const Manifest: InstrumentSpec[] = [
    {
        id: 'piano',
        maxSeconds: 3.5,
        // A piano changes enormously bass to treble, plus inharmonicity, so
        // it gets the most zones: C and F# of each octave is 6 semitones.
        zones: [
            vcsl(`${PianoDir}JHPiano_NoSus_Close_C2_vl3_rr1.wav`, 'C2'),
            vcsl(`${PianoDir}JHPiano_NoSus_Close_F#2_vl3_rr1.wav`, 'F#2'),
            vcsl(`${PianoDir}JHPiano_NoSus_Close_C3_vl3_rr1.wav`, 'C3'),
            vcsl(`${PianoDir}JHPiano_NoSus_Close_F#3_vl3_rr1.wav`, 'F#3'),
            vcsl(`${PianoDir}JHPiano_NoSus_Close_C4_vl3_rr1.wav`, 'C4'),
            vcsl(`${PianoDir}JHPiano_NoSus_Close_F#4_vl3_rr1.wav`, 'F#4'),
            vcsl(`${PianoDir}JHPiano_NoSus_Close_C5_vl3_rr1.wav`, 'C5'),
            vcsl(`${PianoDir}JHPiano_NoSus_Close_F#5_vl3_rr1.wav`, 'F#5'),
            vcsl(`${PianoDir}JHPiano_NoSus_Close_C6_vl3_rr1.wav`, 'C6'),
        ],
    },
    {
        id: 'saxophone',
        maxSeconds: 2.5,
        zones: [
            vcsl(`${SaxDir}BrettTenor_NV_Main_C2_vl3_rr1.wav`, 'C2'),
            vcsl(`${SaxDir}BrettTenor_NV_Main_F#2_vl3_rr1.wav`, 'F#2'),
            vcsl(`${SaxDir}BrettTenor_NV_Main_C3_vl3_rr1.wav`, 'C3'),
            vcsl(`${SaxDir}BrettTenor_NV_Main_F#3_vl3_rr1.wav`, 'F#3'),
            vcsl(`${SaxDir}BrettTenor_NV_Main_C4_vl3_rr1.wav`, 'C4'),
            vcsl(`${SaxDir}BrettTenor_NV_Main_F#4_vl3_rr1.wav`, 'F#4'),
            vcsl(`${SaxDir}BrettTenor_NV_Main_C5_vl3_rr1.wav`, 'C5'),
        ],
    },
    {
        id: 'bell',
        maxSeconds: 3.5,
        // Tubular bells are inharmonic: the pitch you hear is a virtual one
        // implied by partials (measured at ratios 2.47, 4.01, 5.87 of the
        // nominal note), with no energy at the fundamental itself. Nothing to
        // tune against, so the library's label stands.
        inharmonic: true,
        // Struck metal barely changes colour with pitch, so four zones cover
        // the whole useful range.
        zones: [
            vcsl(`${BellDir}chimes_C3_f_rr1.wav`, 'C3'),
            vcsl(`${BellDir}chimes_F#3_fff_rr1.wav`, 'F#3'),
            vcsl(`${BellDir}chimes_C4_ff_rr2.wav`, 'C4'),
            vcsl(`${BellDir}chimes_E4_ff_rr2.wav`, 'E4'),
        ],
    },
    {
        id: 'didgeridoo',
        maxSeconds: 3,
        // A drone instrument with one fundamental; the range it can honestly
        // cover is declared in the generated zone map.
        zones: [
            vcsl(
                'Aerophones/Lip Aerophones/Didgeridoo/Didgeridoo1_Sus2_Main.wav',
                'detect',
            ),
        ],
    },
    {
        id: 'violin',
        maxSeconds: 2.5,
        // Solo violin with vibrato, rather than the ensemble patches: one
        // player reads as "a violin" where a section reads as "strings".
        pack: { source: 'vsco', entry: 'SViolinVib.xrni', spacing: 6 },
    },
    {
        id: 'flute',
        maxSeconds: 2.5,
        pack: { source: 'vsco', entry: 'FluteSusVib.xrni', spacing: 6 },
    },
    {
        id: 'trumpet',
        maxSeconds: 2.5,
        pack: { source: 'vsco', entry: 'TrumpetSus.xrni', spacing: 6 },
    },
    {
        id: 'drums',
        maxSeconds: 2,
        pitched: false,
        // Percussion needs exactly one zone per kit piece and is never
        // transposed: degrees index the kit instead. Roots are the General
        // MIDI drum numbers, so the order here matches the `kit` array in
        // `src/output/Music/instruments.ts`.
        zones: [
            vcsl(
                'Membranophones/Struck Membranophones/Bass Drum 2/bassdrum_hit_f.wav',
                'C2',
            ),
            vcsl(
                'Membranophones/Struck Membranophones/Snare Drum, Modern 1/Snare2_HitSN_v5_rr1_Mid.wav',
                'D2',
            ),
            vcsl(
                'Idiophones/Struck Idiophones/Hi-Hat Cymbal/HiHat_HitC_v3_rr1_Mid.wav',
                'F#2',
            ),
            vcsl(
                'Idiophones/Struck Idiophones/Suspended Cymbal 1/susCymb1_hit_f1.wav',
                'C#3',
            ),
            vcsl(
                'Membranophones/Struck Membranophones/Tom 1/Mallet/TomH_HitM_v3_rr1_Mid.wav',
                'D3',
            ),
            vcsl(
                'Idiophones/Struck Idiophones/Cowbells/Cowbell1_Hit_v3_rr1_Mid.wav',
                'G#3',
            ),
        ],
    },
];

/**
 * The instruments in the palette that ship synthesis only. Named here rather
 * than left implicit so the gap is a roadmap and not a silent omission: these
 * are precisely the culturally specific instruments open CC0 libraries have
 * not recorded, plus the ambient sounds. Synthesizing a sitar or an erhu
 * would be a caricature of an instrument that carries a tradition, which is
 * worse than shipping neither — so they keep their generic synth voice until
 * a real recording is curated.
 */
export const SynthesisOnly = [
    'guitar',
    'djembe',
    'sitar',
    'erhu',
    'oud',
    'panFlute',
    'nativeAmericanFlute',
    'bagpipes',
    'cat',
    'dog',
    'water',
    'nature',
    'city',
];

/**
 * Target loudness for every zone, in LUFS.
 *
 * Chosen as the quietest level every zone can actually reach rather than a
 * round number: percussion has a high crest factor, so a drum hit hits the
 * peak ceiling while still several LU short of a louder target, and would
 * then sit audibly under the sustained instruments — the exact mismatch
 * loudness normalization exists to prevent. The build fails if any zone can't
 * reach this, so raising it is a decision the pipeline forces you to make
 * deliberately.
 */
export const TargetLoudness = -26;
/** Never let a normalized zone exceed this peak. */
export const PeakCeiling = 0.89;
/** Everything ships at one rate and one encoder. */
export const SampleRate = 44100;
/** Mono, since pan is applied at playback. */
export const Bitrate = 96;
/** The fade applied to every zone's tail. */
export const ReleaseFade = 0.03;
/** The largest tuning offset we'll accept as real. Professionally recorded
 * libraries sit within a few cents of A440; anything further means the file
 * isn't the note it claims to be. */
export const MaxDetuneCents = 50;
/** How far a normalized zone may sit from the loudness target before we call
 * it a problem. */
export const MaxLoudnessError = 1.5;
