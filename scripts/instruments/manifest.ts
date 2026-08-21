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
    /** SPDX licence, when the file's own licence differs from its library's.
     * Commons hosts every licence there is, so its files must say. */
    license?: string;
    /** Who recorded it, required for any licence that asks for attribution. */
    author?: string;
    /** The page the file and its licence can be checked on. */
    page?: string;
    /**
     * Take only a window of the recording, from this many seconds in.
     *
     * A field recording of an animal is a series of sounds with the world in
     * between, so one file yields many zones — each declares where its own
     * sound starts. Trimming still runs afterwards, so the window only has to
     * be roughly right at the edges.
     */
    from?: number;
    /** How many seconds of that window to keep. Omit to run to the end. */
    seconds?: number;
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
    /**
     * True for struck and plucked instruments, whose loudness is carried by
     * the attack. They are measured by their loudest short-term window rather
     * than integrated loudness: integrating over a note that is mostly decay
     * under-reads it, so the peak ceiling binds before the target is met and
     * the zone ships quieter than everything around it. Defaults to whether
     * the instrument is unpitched.
     */
    struck?: boolean;
    /**
     * The dBFS below which audio counts as silence when trimming, when the
     * default is wrong for this instrument's recordings.
     *
     * The default suits a studio library. A recording made in a room has a
     * noise floor tens of dB above it, so nothing ever falls below the
     * threshold and the trim quietly does nothing — leaving the dead air it
     * exists to remove, which on a rhythmic grid means the sound lands late.
     * Set this above the recording's own noise floor and below its quietest
     * real content.
     */
    silenceFloor?: number;
    /**
     * Put every zone's attack peak this many seconds from the start.
     *
     * For a plucked or struck instrument, where the peak is the attack. Low
     * strings rise more slowly than high ones, so trimming silence leaves the
     * bass notes peaking later than the treble and later than whatever else
     * is on the beat. Opt-in rather than automatic: on a sustained instrument
     * the loudest moment is somewhere mid-note, and aligning to it would
     * throw away the attack entirely.
     */
    alignPeak?: number;
};

const PianoDir = 'Chordophones/Zithers/Grand Piano, Steinway B/NoSus/';
const SaxDir = 'Aerophones/Reed Aerophones/Tenor Saxophone/Non-Vibrato/';
const BellDir = 'Idiophones/Struck Idiophones/Tubular Bells 1/';
const HarmonicaDir =
    'Aerophones/Free Aerophones/Harmonica-Hohner-Super64/Sustains/Normal/';

/** A VCSL zone. */
function vcsl(path: string, root: string): ZoneSpec {
    return { source: 'vcsl', path, root };
}

/** A recording contributed directly, committed under sources/. The root only
 * matters for a pitched instrument; a kit piece is played as recorded. */
function local(path: string, author: string, root = 'C4'): ZoneSpec {
    return { source: 'local', path, root, license: 'CC0-1.0', author };
}

/** A Freesound pack contributed under a credit licence, committed under
 * sources/ with its own LICENSE.md. Unlike `local`, the licence is not CC0,
 * so each zone carries the pack's terms and author into the lockfile. */
function freesound(
    dir: string,
    file: string,
    root: string,
    license: string,
    author: string,
): ZoneSpec {
    return {
        source: 'local',
        path: `${dir}/${file}`,
        root,
        license,
        author,
        page: `https://freesound.org/s/${file.split('__')[0]}/`,
    };
}

/** The dogs, each a Commons recording of one animal. Declared once here
 * because every bark cut from a file repeats its whole provenance. */
const Dogs = {
    rottweiler: {
        path: 'b/b6/Rottweiler_Barking.oga',
        license: 'CC-BY-SA-4.0',
        author: 'MichaeltheFox8621',
        page: 'https://commons.wikimedia.org/wiki/File:Rottweiler_Barking.oga',
    },
    perro: {
        path: '1/1c/Perro_ladrando.ogg',
        license: 'CC-BY-SA-4.0',
        author: 'Armartinell',
        page: 'https://commons.wikimedia.org/wiki/File:Perro_ladrando.ogg',
    },
    amada: {
        path: 'a/a2/Barking_of_a_dog.ogg',
        license: 'CC-BY-SA-3.0',
        author: 'Amada44',
        page: 'https://commons.wikimedia.org/wiki/File:Barking_of_a_dog.ogg',
    },
    amada2: {
        path: '5/58/Barking_of_a_dog_2.ogg',
        license: 'CC-BY-SA-3.0',
        author: 'Amada44',
        page: 'https://commons.wikimedia.org/wiki/File:Barking_of_a_dog_2.ogg',
    },
    madsen: {
        path: 'e/e9/Madsen-audio-01.flac',
        license: 'CC-BY-SA-4.0',
        author: 'Kent Madsen (Designermadsen)',
        page: 'https://commons.wikimedia.org/wiki/File:Madsen-audio-01.flac',
    },
} as const;

/** One bark, cut from a recording of many. The window is generous at both
 * ends; trimming finds the real edges afterwards. */
function bark(dog: keyof typeof Dogs, from: number, seconds: number): ZoneSpec {
    return { source: 'commons', root: 'C4', ...Dogs[dog], from, seconds };
}

export const Manifest: InstrumentSpec[] = [
    {
        id: 'piano',
        maxSeconds: 3.5,
        struck: true,
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
        id: 'harmonica',
        maxSeconds: 2.5,
        // A chromatic harmonica, four octaves of it. Free reeds are a separate
        // plate per hole, so the colour moves across the range the way a
        // saxophone's does: C and G of each octave, the palette's usual ~6
        // semitones. The library ships E of each octave too, if that ever
        // reads thin. The space before the underscore is the library's own.
        zones: [
            vcsl(`${HarmonicaDir}Hohner-Super64_Normal _C2.wav`, 'C2'),
            vcsl(`${HarmonicaDir}Hohner-Super64_Normal _G2.wav`, 'G2'),
            vcsl(`${HarmonicaDir}Hohner-Super64_Normal _C3.wav`, 'C3'),
            vcsl(`${HarmonicaDir}Hohner-Super64_Normal _G3.wav`, 'G3'),
            vcsl(`${HarmonicaDir}Hohner-Super64_Normal _C4.wav`, 'C4'),
            vcsl(`${HarmonicaDir}Hohner-Super64_Normal _G4.wav`, 'G4'),
            vcsl(`${HarmonicaDir}Hohner-Super64_Normal _C5.wav`, 'C5'),
            vcsl(`${HarmonicaDir}Hohner-Super64_Normal _G5.wav`, 'G5'),
            vcsl(`${HarmonicaDir}Hohner-Super64_Normal _C6.wav`, 'C6'),
        ],
    },
    {
        id: 'bell',
        maxSeconds: 3.5,
        struck: true,
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
        id: 'acousticGuitar',
        maxSeconds: 3,
        // A pluck's loudness is all in its attack.
        struck: true,
        // Measured, in two steps. The palette's other struck instruments
        // land their peaks 30-45 ms into the *decoded* file, and mp3 adds a
        // constant ~25 ms of encoder delay in front of every zone, so their
        // peaks sit 5-20 ms into the audio this runs on. Fifteen puts both
        // guitars in the middle of that band instead of trailing it, while
        // still leaving the pluck a rise rather than starting on the peak.
        alignPeak: 0.015,
        // A nylon-strung classical guitar, finger-plucked. Nine zones about
        // five semitones apart across E2-A5, which is the guitar's range plus
        // the top of its first string; a plucked string changes colour enough
        // across the neck that stretching one sample further reads as a
        // different instrument. One mid-velocity layer per zone, per the
        // pack's five: loudness normalization does what a velocity layer
        // would, and `volume` is a gain multiplier rather than a layer switch.
        zones: [
            freesound(
                'acousticGuitar',
                '182960__quartertone__gtrclass-00f6s40v03.wav',
                'E2',
                'CC-BY-4.0',
                'quartertone',
            ),
            freesound(
                'acousticGuitar',
                '182963__quartertone__gtrclass-00f5s45v03.wav',
                'A2',
                'CC-BY-4.0',
                'quartertone',
            ),
            freesound(
                'acousticGuitar',
                '182939__quartertone__gtrclass-00f4s50v03.wav',
                'D3',
                'CC-BY-4.0',
                'quartertone',
            ),
            freesound(
                'acousticGuitar',
                '182942__quartertone__gtrclass-00f3s55v03.wav',
                'G3',
                'CC-BY-4.0',
                'quartertone',
            ),
            freesound(
                'acousticGuitar',
                '183067__quartertone__gtrclass-02f2s61v03.wav',
                'C#4',
                'CC-BY-4.0',
                'quartertone',
            ),
            freesound(
                'acousticGuitar',
                '183062__quartertone__gtrclass-02f1s66v03.wav',
                'F#4',
                'CC-BY-4.0',
                'quartertone',
            ),
            freesound(
                'acousticGuitar',
                '183070__quartertone__gtrclass-07f1s71v03.wav',
                'B4',
                'CC-BY-4.0',
                'quartertone',
            ),
            freesound(
                'acousticGuitar',
                '182950__quartertone__gtrclass-12f1s76v03.wav',
                'E5',
                'CC-BY-4.0',
                'quartertone',
            ),
            freesound(
                'acousticGuitar',
                '182993__quartertone__gtrclass-17f1s81v03.wav',
                'A5',
                'CC-BY-4.0',
                'quartertone',
            ),
        ],
    },
    {
        id: 'electricGuitar',
        maxSeconds: 3,
        // A pluck's loudness is all in its attack.
        struck: true,
        // Measured, in two steps. The palette's other struck instruments
        // land their peaks 30-45 ms into the *decoded* file, and mp3 adds a
        // constant ~25 ms of encoder delay in front of every zone, so their
        // peaks sit 5-20 ms into the audio this runs on. Fifteen puts both
        // guitars in the middle of that band instead of trailing it, while
        // still leaving the pluck a rise rather than starting on the peak.
        alignPeak: 0.015,
        // A steel-strung electro-acoustic, which is what the pack is: a body
        // with a pickup rather than a solid-body electric, so it is brighter
        // and more metallic than the nylon classical without being a distorted
        // rock tone. Eight zones over E2-D#5, the range the pack covers.
        zones: [
            freesound(
                'electricGuitar',
                '251014__project16__e1v3.flac',
                'E2',
                'CC-BY-3.0',
                'Project16',
            ),
            freesound(
                'electricGuitar',
                '251037__project16__a1v3.flac',
                'A2',
                'CC-BY-3.0',
                'Project16',
            ),
            freesound(
                'electricGuitar',
                '251149__project16__d1v3.flac',
                'D3',
                'CC-BY-3.0',
                'Project16',
            ),
            freesound(
                'electricGuitar',
                '251171__project16__g2v3.flac',
                'G3',
                'CC-BY-3.0',
                'Project16',
            ),
            freesound(
                'electricGuitar',
                '251110__project16__c2v3.flac',
                'C#4',
                'CC-BY-3.0',
                'Project16',
            ),
            freesound(
                'electricGuitar',
                '251121__project16__f3v3.flac',
                'F#4',
                'CC-BY-3.0',
                'Project16',
            ),
            freesound(
                'electricGuitar',
                '251193__project16__b3v3.flac',
                'B4',
                'CC-BY-3.0',
                'Project16',
            ),
            freesound(
                'electricGuitar',
                '251146__project16__d3v3.flac',
                'D#5',
                'CC-BY-3.0',
                'Project16',
            ),
        ],
    },
    {
        id: 'cat',
        maxSeconds: 3.5,
        pitched: false,
        // A meow is held, not struck. Measured by its loudest short window it
        // read as much louder than it is, so normalization applied too little
        // gain and the cat shipped up to 4 dB under everything else; measured
        // whole, like the flute and the saxophone, every zone lands on target.
        struck: false,
        // Recorded in a room rather than a studio, so the noise floor sits
        // around -50 dBFS and the default threshold never fires. Above the
        // room, below the quietest meow.
        silenceFloor: -40,
        // A cat is a kit, not a note: twelve recordings of one cat asking for
        // different things, so a degree picks which thing it's saying rather
        // than a pitch. Ordered dark to bright by spectral centroid, the way
        // a drum kit runs low to high — Irritated is the punchiest and lands
        // on degree 1, and Purr is a sustained texture at the top rather than
        // a hit.
        zones: [
            local('cat/Irritated.wav', 'Amy J. Ko'),
            local('cat/Begging.wav', 'Amy J. Ko'),
            local('cat/Hungry.wav', 'Amy J. Ko'),
            local('cat/Protesting.wav', 'Amy J. Ko'),
            local('cat/Pleading.wav', 'Amy J. Ko'),
            local('cat/Wishful.wav', 'Amy J. Ko'),
            local('cat/Bothered.wav', 'Amy J. Ko'),
            local('cat/Scared.wav', 'Amy J. Ko'),
            local('cat/Sensitive.wav', 'Amy J. Ko'),
            local('cat/Comforted.wav', 'Amy J. Ko'),
            local('cat/Lonely.wav', 'Amy J. Ko'),
            local('cat/Purr.wav', 'Amy J. Ko'),
        ],
    },
    {
        id: 'pitchedCat',
        maxSeconds: 3.5,
        // The same cat, as an instrument you can write a tune for.
        //
        // A meow that wanders in pitch transposes into something that sounds
        // broken rather than sung, so the zone is the one recording of the
        // twelve that holds still: Bothered stays within 26 cents across the
        // whole note and lands 1 cent off concert G. The others are not close
        // — Pleading glides 85 cents, Irritated 240, and four have no stable
        // pitch at all — which is why this is one chosen zone and not the kit.
        struck: false,
        silenceFloor: -40,
        zones: [local('cat/Bothered.wav', 'Amy J. Ko', 'G4')],
    },
    {
        id: 'dog',
        maxSeconds: 2,
        pitched: false,
        // Twelve barks from five dogs, cut out of Commons field recordings —
        // one file is a dozen barks with a street in between, so each zone
        // declares its own window. Ordered dark to bright by zero-crossing
        // rate, the way the cat kit is: the Rottweiler's chest-deep woof is
        // degree 1, and the smallest, sharpest yap is degree 12.
        //
        // Recorded outdoors, so the noise floor is far above a studio's and
        // the default trim would never fire.
        silenceFloor: -40,
        zones: [
            bark('rottweiler', 22.26, 0.5),
            bark('rottweiler', 8.46, 0.45),
            bark('perro', 0.05, 0.45),
            bark('rottweiler', 36.0, 0.45),
            bark('madsen', 1.93, 0.5),
            bark('amada2', 2.4, 0.55),
            bark('amada', 1.16, 0.4),
            bark('amada', 1.87, 0.4),
            bark('madsen', 2.68, 0.6),
            bark('amada2', 3.34, 0.55),
            bark('amada2', 1.48, 0.5),
            bark('amada', 0.18, 0.4),
        ],
    },
    {
        id: 'pitchedDog',
        maxSeconds: 2,
        // The same dogs, as an instrument you can write a tune for. Of the
        // sixty-odd barks the kit was chosen from, this one carries a pitch
        // most clearly: its median sits at 660 Hz against concert E5's 659.3,
        // two cents out, and it is the cleanest of them at 40 dB over its
        // recording's noise floor — which matters, because normalization
        // lifts the street along with the dog.
        //
        // Marked inharmonic because a bark is not a note: this one glides
        // about a semitone from start to finish, so there is no steady
        // fundamental to measure a drift against. Asked for a tuning offset
        // anyway, the measurement locks onto the sharp end of the glide and
        // returns 40 cents, which would pull the bark *away* from its own
        // centre. Shipping it at its label is the more honest answer.
        inharmonic: true,
        struck: false,
        silenceFloor: -40,
        zones: [{ ...bark('amada', 1.16, 0.4), root: 'E5' }],
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
 * The instruments that are synthesizers on purpose, rather than instruments
 * we failed to find recordings for. Every other palette entry has real zones;
 * anything that has neither fails `npm run instruments`, so the palette can't
 * quietly grow an oscillator imitation of a real instrument again.
 */
export const SynthesisOnly = ['synth', 'synthBass', 'synthPad', 'voice'];

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
