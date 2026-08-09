/**
 * The phoneme table: what every IPA symbol does to the vocal synthesizer.
 *
 * Pure data plus a parser, so the whole phonetic vocabulary is unit-testable
 * without an `AudioContext`. `articulate.ts` turns a sequence of these into
 * timed targets and `MusicAudio` writes those targets onto `AudioParam`s;
 * nothing here knows Web Audio exists.
 *
 * **Formant values are authored at the neutral ~16cm tract described in
 * `voice.ts` and never scale with pitch.** They are roughly the midpoint of
 * published adult male and adult female measurements, which is what makes the
 * voice read as neither.
 *
 * **The bank is parallel, so amplitudes carry as much as frequencies.** Each
 * formant is a bandpass fed from the same source and summed, which means a
 * formant's `gain` decides how much of the vowel's identity it contributes —
 * a consonant is very often the same four frequencies with different
 * amplitudes. Adjacent formants are summed with **alternating sign**, the
 * standard fix for a parallel bank: same-sign neighbours cancel in the valleys
 * between them and hollow out the spectrum.
 *
 * **Coverage is honest but not uniform.** Every symbol below produces a
 * distinct, deliberate sound, and vowels, nasals, approximants, and fricatives
 * are good. Plosives are adequate — their place of articulation is carried by
 * the formant transition into the next vowel more than by the burst, which is
 * `articulate.ts`'s job. Clicks, implosives, and pharyngeals are crude: they
 * are recognizably *something*, and are not claimed to be more than that. For
 * a caricature of a voice that is the right trade, and it is stated here so
 * nobody reads the size of this table as a claim of fidelity.
 */

export type Formant = {
    /** Centre frequency in Hz. */
    hz: number;
    /** Bandwidth in Hz; the filter's Q is `hz / bw`. */
    bw: number;
    /** Amplitude in the parallel sum. Negative on alternating formants. */
    gain: number;
};

export type Manner =
    | 'vowel'
    | 'approximant'
    | 'lateral'
    | 'nasal'
    | 'fricative'
    | 'trill'
    | 'plosive'
    | 'click';

export type Phoneme = {
    /** The symbol this came from, for tests and descriptions. */
    ipa: string;
    manner: Manner;
    voiced: boolean;
    formants: readonly [Formant, Formant, Formant, Formant];
    /** A spectral zero, for nasals and laterals. */
    antiformant: { hz: number; bw: number } | undefined;
    /** How much of the source is noise rather than glottal pulse, 0–1. */
    noise: number;
    /** Seconds this takes, or `'sustain'` to fill whatever the note leaves. */
    seconds: number | 'sustain';
    /** Seconds of silence before it, for a stop's closure. */
    closure: number;
    /** Seconds of voiceless breath after a stop's burst. */
    aspiration: number;
    /** Amplitude modulation in Hz, for a trill; 0 for everything else. */
    flutter: number;
    /** Level relative to an open vowel. */
    gain: number;
};

/** Relative amplitudes of the four formants, alternating in sign. */
const Amplitudes = [1, -0.6, 0.34, -0.2];

/** Bandwidths widen with frequency, and each formant is damped more than the
 * one below it — a real tract's losses rise with frequency. */
const Bandwidths = [
    (hz: number) => 55 + hz / 25,
    (hz: number) => 85 + hz / 40,
    (hz: number) => 130 + hz / 40,
    () => 220,
];

/**
 * The power a bank is normalized to — a mid vowel's, so a vowel's amplitudes
 * come out close to as written.
 *
 * The amplitudes above describe the *shape* of a phoneme's spectrum and its
 * `gain` describes how loud it is, and those two only stay separable if every
 * shape carries the same power. Left unnormalized they do not, by a lot: a
 * fricative's four bands are three times as wide and add in phase, while a
 * vowel's are narrow and alternate in sign so they partly cancel — about 13
 * LU between them, measured. Every lyric would lurch at its sibilants, and
 * `gain` would be a number that did not mean anything.
 */
const ShapePower = 150;

function bank(
    hz: readonly [number, number, number, number],
    damping = 1,
    amplitudes: readonly number[] = Amplitudes,
): readonly [Formant, Formant, Formant, Formant] {
    const widths = hz.map(
        (frequency, index) => Bandwidths[index](frequency) * damping,
    );
    // A bandpass passes power in proportion to its width, so the shape's power
    // is the widths weighted by the squared amplitudes.
    let power = 0;
    for (let index = 0; index < 4; index++)
        power = power + amplitudes[index] * amplitudes[index] * widths[index];
    const scale = Math.sqrt(ShapePower / power);
    const at = (index: number): Formant => ({
        hz: hz[index],
        bw: widths[index],
        gain: amplitudes[index] * scale,
    });
    return [at(0), at(1), at(2), at(3)];
}

/**
 * How far the noise-driven phonemes sit below what their tables say.
 *
 * Their gains were written as relative levels among themselves — a sibilant
 * three times a labial — before any of them had been measured against a
 * vowel. This is the one number that puts the whole group where speech puts
 * it, derived by `scripts/instruments/voiceGain.ts`, and it is a factor here
 * rather than 60 edited literals so the relative pattern stays readable.
 */
const NoisyLevel = 0.6;

const Base = {
    antiformant: undefined,
    closure: 0,
    aspiration: 0,
    flutter: 0,
};

/**
 * A vowel: voiced, no noise beyond the source's own breath, and it holds for
 * as long as the note has left.
 *
 * Its level follows how open it is, because a wide mouth radiates better than
 * a narrow one — an `a` is about 5 dB above an `i` in speech, and a bank of
 * filters has no lips, so it has to be told. F1 is openness, which is most of
 * it; the smaller F2 term is there because the source falls at 6 dB an octave,
 * so a front vowel with its second formant up at 2.5kHz is fed less than a
 * back one at 1kHz and needs it back. Both exponents were fitted against
 * published relative vowel intensities by `scripts/instruments/voiceGain.ts`,
 * which is also what will tell you if an edit here has broken the balance.
 */
function vowel(
    ipa: string,
    f1: number,
    f2: number,
    f3: number,
    f4: number,
): Phoneme {
    return {
        ...Base,
        ipa,
        manner: 'vowel',
        voiced: true,
        formants: bank([f1, f2, f3, f4]),
        noise: 0,
        seconds: 'sustain',
        gain: Math.min(1, Math.pow(f1 / 890, 1.16) * Math.pow(f2 / 1670, 0.36)),
    };
}

/** An approximant or lateral: a vowel's shape, quieter and passing. A lateral
 * adds the spectral zero its side channel produces. */
function glide(
    ipa: string,
    manner: 'approximant' | 'lateral',
    f1: number,
    f2: number,
    f3: number,
    f4: number,
    zero?: number,
): Phoneme {
    return {
        ...Base,
        ipa,
        manner,
        voiced: true,
        formants: bank([f1, f2, f3, f4]),
        // Broad, like the nasals': a lateral's zero comes from a side channel
        // with plenty of loss, and a narrow notch is inaudible.
        antiformant:
            zero === undefined ? undefined : { hz: zero, bw: zero / 1.8 },
        noise: 0,
        seconds: 0.06,
        gain: 0.36,
    };
}

/**
 * A nasal: the mouth is closed, so the sound comes out of a long, lossy nasal
 * tube — a very low, heavily damped first formant — and the closed mouth
 * behind it traps a resonance that cancels a band, which is the antiformant.
 * Where that zero sits is the whole cue for place of articulation.
 */
function nasal(
    ipa: string,
    f2: number,
    f3: number,
    zero: number,
    f1 = 250,
    f4 = 3200,
): Phoneme {
    return {
        ...Base,
        ipa,
        manner: 'nasal',
        voiced: true,
        // Almost all the energy in the low resonance, and the rest damped
        // heavily: the nasal cavity is long and lossy, and a murmur is dark.
        // With the upper formants near a vowel's strength these read as buzzy
        // vowels rather than as anything coming from a nose, and — since place
        // is carried entirely by the zero — as much the same buzzy vowel.
        formants: bank([f1, f2, f3, f4], 2.6, [1, -0.15, 0.06, -0.03]),
        // Wide enough to actually remove a band. A zero at Q 3–10 barely
        // dents the spectrum, which left m, n, and ŋ nearly identical.
        antiformant: { hz: zero, bw: zero / 1.5 },
        noise: 0,
        seconds: 0.09,
        gain: 0.09,
    };
}

/**
 * A fricative: turbulent noise shaped by the cavity in front of the
 * constriction. The four bands are frication peaks rather than vowel
 * formants, so they are wide and equally weighted — a sibilant's spectrum is
 * a plateau, not a set of peaks. A voiced fricative keeps some glottal source
 * under the noise, which is the only thing distinguishing it from its
 * voiceless twin.
 */
function fricative(
    ipa: string,
    voiced: boolean,
    hz: readonly [number, number, number, number],
    gain: number,
): Phoneme {
    return {
        ...Base,
        ipa,
        manner: 'fricative',
        voiced,
        // Damped, so the four bands overlap into a broad shelf rather than
        // standing apart as four resonances. At damping 3 they sat at Q 3.5–13
        // — four tuned pipes over noise, which is what it sounded like. But 12
        // flattened them so far that `s` and `ʃ` became the same plateau: their
        // spectral distance halved. 6 is the measured middle, as flat as 12 by
        // peak-to-median but nearly twice as far apart. Widening rescales the
        // amplitudes through `bank`'s power normalization, so the loudness
        // balance survives it.
        formants: bank(hz, 6, [1, 0.9, 0.7, 0.5]),
        noise: voiced ? 0.7 : 1,
        seconds: 0.085,
        gain: gain * NoisyLevel,
    };
}

/**
 * A stop: silence while the closure holds, then a burst of noise at the
 * frequency the released cavity rings at.
 *
 * The burst is loud and the aspiration after it is short. The other way round —
 * a quiet burst under 30–45ms of breath — is four times more air than pop, and
 * sounds like blowing rather than like a consonant.
 *
 * The burst is brief and does less work than it looks like it should. What
 * actually tells a listener where the closure was is the *transition* — where
 * the following vowel's F2 comes from — so these frequencies double as the
 * locus `articulate.ts` glides out of, and getting the burst approximately
 * right matters far less than getting that glide right.
 */
function stop(
    ipa: string,
    voiced: boolean,
    hz: readonly [number, number, number, number],
    gain: number,
    closure: number,
    aspiration: number,
    /** True for a velar, whose burst is compact — one mid-frequency peak
     * rather than the diffuse spread a labial or alveolar makes. Spreading it
     * across all four bands is what stopped a `k` sounding like a `k`. */
    compact = false,
): Phoneme {
    return {
        ...Base,
        ipa,
        manner: 'plosive',
        voiced,
        formants: bank(
            hz,
            compact ? 1.4 : 2.5,
            compact ? [0.5, 1, 0.35, 0.15] : [0.8, 1, 0.8, 0.6],
        ),
        noise: voiced ? 0.8 : 1,
        seconds: 0.012,
        closure,
        aspiration,
        gain: gain * NoisyLevel,
    };
}

/** A click: a burst with no lung air behind it, so it is short, sharp, and
 * entirely unvoiced. Crude, as the module comment says. */
function click(
    ipa: string,
    hz: readonly [number, number, number, number],
    gain: number,
): Phoneme {
    return {
        ...Base,
        ipa,
        manner: 'click',
        voiced: false,
        formants: bank(hz, 2.5, [0.7, 1, 0.9, 0.7]),
        noise: 1,
        seconds: 0.014,
        closure: 0.04,
        gain: gain * NoisyLevel,
    };
}

/** A trill: an approximant whose amplitude is chopped by the articulator
 * beating against the tract, which is what `flutter` drives. The rates are
 * spread wider than measured speech puts them, since the beating *is* the
 * cue and three trills within 7Hz of each other are one trill. */
function trill(
    ipa: string,
    f1: number,
    f2: number,
    f3: number,
    f4: number,
    flutter: number,
): Phoneme {
    return {
        ...Base,
        ipa,
        manner: 'trill',
        voiced: true,
        formants: bank([f1, f2, f3, f4]),
        noise: 0.1,
        seconds: 0.1,
        flutter,
        gain: 0.37,
    };
}

/**
 * Every phoneme, by symbol.
 *
 * Ordered as the IPA chart is — vowels by height and backness, consonants by
 * manner then place — because that is the order anyone checking a value will
 * look for them in.
 */
export const Phonemes: ReadonlyMap<string, Phoneme> = new Map(
    [
        // Vowels: close
        vowel('i', 390, 2540, 3190, 3600),
        vowel('y', 380, 1890, 2330, 3450),
        vowel('ɨ', 390, 1730, 2650, 3500),
        vowel('ʉ', 390, 1350, 2380, 3400),
        vowel('ɯ', 380, 1300, 2590, 3450),
        vowel('u', 420, 1050, 2540, 3350),
        // Near-close
        vowel('ɪ', 455, 2200, 2870, 3550),
        vowel('ʏ', 450, 1780, 2380, 3400),
        vowel('ʊ', 495, 1175, 2630, 3350),
        // Close-mid
        vowel('e', 505, 2310, 2870, 3550),
        vowel('ø', 500, 1780, 2380, 3400),
        vowel('ɘ', 500, 1620, 2650, 3500),
        vowel('ɵ', 500, 1460, 2430, 3400),
        vowel('ɤ', 515, 1400, 2590, 3450),
        vowel('o', 525, 975, 2645, 3350),
        // Mid — the neutral tract itself, which is what a schwa is.
        vowel('ə', 500, 1500, 2500, 3400),
        // Open-mid
        vowel('ɛ', 655, 1930, 2790, 3550),
        vowel('œ', 640, 1670, 2590, 3400),
        vowel('ɜ', 670, 1620, 2700, 3450),
        vowel('ɞ', 670, 1460, 2540, 3400),
        vowel('ʌ', 690, 1315, 2740, 3450),
        vowel('ɔ', 715, 1065, 2680, 3350),
        // Near-open
        vowel('æ', 630, 2150, 2790, 3550),
        vowel('ɐ', 760, 1460, 2810, 3450),
        // Open
        vowel('a', 890, 1670, 2970, 3600),
        vowel('ɶ', 890, 1510, 2540, 3400),
        vowel('ɑ', 850, 1440, 2670, 3450),
        vowel('ɒ', 790, 970, 2750, 3350),
        // R-coloured, whose signature is a third formant down where a second
        // one usually is.
        vowel('ɚ', 500, 1480, 1820, 3350),
        vowel('ɝ', 500, 1485, 1820, 3350),

        // Nasals, by where the zero sits: further back, higher zero.
        nasal('m', 1190, 2480, 860),
        nasal('ɱ', 1300, 2480, 970),
        nasal('n', 1730, 2900, 1840),
        nasal('ɳ', 1620, 2160, 1730),
        nasal('ɲ', 2270, 3020, 2380),
        nasal('ŋ', 2050, 2700, 3020),
        nasal('ɴ', 1080, 2380, 1080),

        // Laterals
        glide('l', 'lateral', 400, 1400, 2900, 3500, 2150),
        glide('ɫ', 'lateral', 450, 860, 2810, 3400, 2270),
        glide('ɭ', 'lateral', 390, 1190, 2050, 3300, 2050),
        glide('ʎ', 'lateral', 335, 2160, 3130, 3550, 2590),
        glide('ʟ', 'lateral', 390, 970, 2590, 3350, 1940),
        // Approximants. The English r is defined by an F3 far below where any
        // other sound puts it; that one number is the whole cue.
        glide('ɹ', 'approximant', 390, 1190, 1730, 3300),
        glide('ɻ', 'approximant', 370, 1130, 1620, 3250),
        glide('ɰ', 'approximant', 370, 1350, 2590, 3450),
        glide('j', 'approximant', 315, 2540, 3240, 3650),
        glide('w', 'approximant', 335, 755, 2480, 3350),
        glide('ɥ', 'approximant', 315, 2050, 2380, 3400),
        glide('ʋ', 'approximant', 390, 1190, 2480, 3350),
        // Fricatives. Sibilants are far louder than the rest, which is why
        // their gains are three times a labial's rather than nearby.
        fricative('ɸ', false, [1200, 3000, 5500, 7500], 0.15),
        fricative('β', true, [1200, 3000, 5500, 7500], 0.2),
        fricative('f', false, [1000, 4000, 7000, 8500], 0.16),
        fricative('v', true, [1000, 4000, 7000, 8500], 0.22),
        fricative('θ', false, [1400, 5500, 7800, 8800], 0.14),
        fricative('ð', true, [1400, 5500, 7800, 8800], 0.2),
        fricative('s', false, [3500, 5800, 7500, 8500], 0.33),
        fricative('z', true, [3500, 5800, 7500, 8500], 0.3),
        fricative('ʃ', false, [2200, 3400, 4800, 6500], 0.39),
        fricative('ʒ', true, [2200, 3400, 4800, 6500], 0.35),
        fricative('ʂ', false, [1900, 2800, 4200, 6000], 0.36),
        fricative('ʐ', true, [1900, 2800, 4200, 6000], 0.32),
        fricative('ɕ', false, [3000, 4500, 6000, 7500], 0.32),
        fricative('ʑ', true, [3000, 4500, 6000, 7500], 0.29),
        fricative('ç', false, [2600, 4200, 5600, 7000], 0.3),
        fricative('ʝ', true, [2600, 4200, 5600, 7000], 0.3),
        fricative('x', false, [1300, 2200, 3400, 5000], 0.28),
        fricative('ɣ', true, [1300, 2200, 3400, 5000], 0.28),
        fricative('χ', false, [900, 1600, 2800, 4500], 0.26),
        fricative('ʁ', true, [900, 1600, 2800, 4500], 0.28),
        fricative('ħ', false, [700, 1300, 2400, 3600], 0.22),
        fricative('ʕ', true, [700, 1300, 2400, 3600], 0.24),
        fricative('ɬ', false, [2400, 4200, 6000, 7500], 0.35),
        fricative('ɮ', true, [2400, 4200, 6000, 7500], 0.32),
        // The glottal ones have no cavity of their own, so they take the
        // neutral vowel's shape and let whatever follows colour them.
        fricative('h', false, [500, 1500, 2500, 3400], 0.18),
        fricative('ɦ', true, [500, 1500, 2500, 3400], 0.2),

        // Plosives. Voiceless ones aspirate; voiced ones have a shorter
        // closure because the vocal folds keep working through it.
        stop('p', false, [700, 1400, 2400, 3200], 0.5, 0.055, 0.018),
        stop('b', true, [700, 1400, 2400, 3200], 0.25, 0.045, 0),
        stop('t', false, [2800, 4200, 5500, 7000], 0.65, 0.055, 0.02),
        stop('d', true, [2800, 4200, 5500, 7000], 0.3, 0.045, 0),
        stop('ʈ', false, [2200, 3000, 4200, 5500], 0.6, 0.055, 0.02),
        stop('ɖ', true, [2200, 3000, 4200, 5500], 0.28, 0.045, 0),
        stop('c', false, [2600, 3400, 4200, 5200], 0.6, 0.05, 0.018),
        stop('ɟ', true, [2600, 3400, 4200, 5200], 0.28, 0.042, 0),
        stop('k', false, [1500, 1900, 2600, 3600], 0.6, 0.06, 0.025, true),
        stop('ɡ', true, [1500, 1900, 2600, 3600], 0.28, 0.05, 0, true),
        stop('q', false, [1100, 1700, 2600, 3800], 0.5, 0.06, 0.022),
        stop('ɢ', true, [1100, 1700, 2600, 3800], 0.25, 0.05, 0),
        // A glottal stop is closure and nothing else — the burst is the
        // voice restarting, which the next phoneme already provides.
        stop('ʔ', false, [500, 1500, 2500, 3400], 0, 0.06, 0),
        // Implosives: voiced stops with the larynx pulled down, which we
        // approximate as a longer closure and a duller burst. Crude.
        stop('ɓ', true, [500, 1100, 2200, 3100], 0.22, 0.07, 0),
        stop('ɗ', true, [2200, 3400, 4600, 6000], 0.26, 0.07, 0),
        stop('ʄ', true, [2200, 3000, 3900, 5000], 0.24, 0.07, 0),
        stop('ɠ', true, [1300, 1900, 2900, 3900], 0.24, 0.07, 0),
        stop('ʛ', true, [900, 1500, 2400, 3500], 0.22, 0.07, 0),

        // Clicks
        click('ʘ', [800, 1500, 2600, 3400], 0.35),
        click('ǀ', [2600, 4000, 5600, 7000], 0.4),
        click('ǃ', [1200, 2400, 3600, 5000], 0.55),
        click('ǂ', [2200, 3200, 4400, 5800], 0.45),
        click('ǁ', [1800, 3000, 4600, 6200], 0.45),

        // Trills and taps. A tap is a stop too brief to build pressure.
        trill('r', 400, 1300, 2600, 3400, 30),
        trill('ʀ', 450, 1150, 2400, 3300, 22),
        trill('ʙ', 350, 800, 2200, 3100, 14),
        stop('ɾ', true, [2600, 3800, 5000, 6500], 0.2, 0.022, 0),
        stop('ɽ', true, [2000, 2900, 4000, 5400], 0.2, 0.022, 0),
    ].map((phoneme): [string, Phoneme] => [phoneme.ipa, phoneme]),
);

/** Whether a phoneme can be held to fill out a note, or is over when it is
 * over. A stop cannot be sustained; humming an `m` is perfectly normal. */
export function canSustain(phoneme: Phoneme): boolean {
    return phoneme.manner !== 'plosive' && phoneme.manner !== 'click';
}

/** The vowel a syllable falls back to when it has none written, and the shape
 * an unrecognized symbol resolves to. */
export function neutralVowel(): Phoneme {
    const schwa = Phonemes.get('ə');
    if (schwa === undefined) throw new Error('the schwa is missing');
    return schwa;
}

/** Modifiers that change the phoneme before them rather than adding one. */
const Lengtheners = new Set(['ː', 'ˑ']);
const Stresses = new Set(['ˈ', 'ˌ']);
/** Combining marks and modifier letters we act on. */
const Nasalize = '̃';
const Devoice = '̥';
const Aspirate = 'ʰ';
const Labialize = 'ʷ';
const Palatalize = 'ʲ';
const Velarize = 'ˠ';
const Pharyngealize = 'ˤ';
const Ejective = 'ʼ';
/** Symbols that carry no sound of their own: tie bars joining an affricate,
 * syllable and phrase boundaries, and the marks we do not model. */
const Ignored = new Set(['͡', '͜', '.', '|', '‖', '‿', '̩', '̯']);

function shift(
    phoneme: Phoneme,
    change: (formant: Formant, index: number) => Formant,
): Phoneme {
    const [f1, f2, f3, f4] = phoneme.formants;
    return {
        ...phoneme,
        formants: [change(f1, 0), change(f2, 1), change(f3, 2), change(f4, 3)],
    };
}

/** Move a formant by a ratio, keeping its bandwidth proportional. */
function scaleFormant(formant: Formant, ratio: number): Formant {
    return { ...formant, hz: formant.hz * ratio, bw: formant.bw * ratio };
}

/** What a symbol appearing after a phoneme does to it. */
function modify(phoneme: Phoneme, symbol: string): Phoneme | undefined {
    if (Lengtheners.has(symbol))
        return {
            ...phoneme,
            seconds:
                phoneme.seconds === 'sustain'
                    ? 'sustain'
                    : phoneme.seconds * (symbol === 'ː' ? 2 : 1.5),
        };
    if (symbol === Nasalize)
        return { ...phoneme, antiformant: { hz: 1200, bw: 400 } };
    if (symbol === Devoice) return { ...phoneme, voiced: false, noise: 1 };
    if (symbol === Aspirate)
        return { ...phoneme, aspiration: Math.max(phoneme.aspiration, 0.05) };
    // Rounding the lips lengthens the tract in front of the constriction, so
    // the upper formants come down; the reverse for a palatal tongue.
    if (symbol === Labialize)
        return shift(phoneme, (formant, index) =>
            index === 0 ? formant : scaleFormant(formant, 0.85),
        );
    if (symbol === Palatalize)
        return shift(phoneme, (formant, index) =>
            index === 1 || index === 2 ? scaleFormant(formant, 1.2) : formant,
        );
    if (symbol === Velarize || symbol === Pharyngealize)
        return shift(phoneme, (formant, index) =>
            index === 1 ? scaleFormant(formant, 0.7) : formant,
        );
    return undefined;
}

export type Syllable = {
    phonemes: readonly Phoneme[];
    /** 1 for unstressed, higher for a stressed syllable. */
    stress: number;
};

/**
 * Read IPA into phonemes.
 *
 * Unknown symbols are skipped rather than refused. The palette is already
 * permissive by design — `🔈('anything')` is legal — and a creator
 * experimenting with a phonetic alphabet should hear the parts we know rather
 * than silence, which is indistinguishable from a broken instrument.
 */
export function toSyllable(text: string): Syllable {
    const phonemes: Phoneme[] = [];
    let stress = 1;
    for (const symbol of text.normalize('NFD')) {
        if (Ignored.has(symbol)) continue;
        if (Stresses.has(symbol)) {
            stress = symbol === 'ˈ' ? 1.35 : 1.15;
            continue;
        }
        const previous = phonemes[phonemes.length - 1];
        if (previous !== undefined) {
            // An ejective is a glottal closure after the stop, not a change
            // to it, so it is the one modifier that adds a phoneme.
            if (symbol === Ejective) {
                const glottal = Phonemes.get('ʔ');
                if (glottal !== undefined) phonemes.push(glottal);
                continue;
            }
            const modified = modify(previous, symbol);
            if (modified !== undefined) {
                phonemes[phonemes.length - 1] = modified;
                continue;
            }
        }
        const phoneme = Phonemes.get(symbol);
        if (phoneme !== undefined) phonemes.push(phoneme);
    }
    return { phonemes, stress };
}
