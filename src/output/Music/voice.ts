/**
 * The vocal synthesizer's own constants: what the source sounds like before
 * any phoneme shapes it, and the handful of deliberate deviations from a real
 * voice that keep it a caricature.
 *
 * **The design is that this must never be mistaken for a person.** Two
 * requirements pull the same direction, so one decision serves both. A
 * synthesized voice that aims at realism and misses lands in the uncanny
 * valley; and a voice that reads as realistic also reads as *gendered*, since
 * listeners hear gender in vocal tract length far more than in pitch. In a
 * real singer those two are coupled — a low note comes from a big body, and
 * the formants sit low to match.
 *
 * So we cut the coupling: the formant table in `phonemes.ts` is authored once
 * at a neutral ~16cm tract, midway between a typical adult male's ~17.5cm and
 * a typical adult female's ~14.5cm, and **it does not move with pitch**. Two
 * octaves of melody come out of the same size head. That is anatomically
 * impossible, which is exactly why it reads as an instrument rather than a
 * person, and why it reads as neither a man nor a woman at any pitch. The
 * remaining gender cues — spectral tilt, breathiness, vibrato — are held at
 * unremarkable middle values here rather than tuned toward either pole.
 *
 * Everything in this module is pure data or pure arithmetic, so the whole
 * character of the voice is unit-testable; `MusicAudio` only turns it into
 * nodes.
 */

/** The neutral vocal tract the formant table is authored at, in centimeters.
 * Recorded for the reader rather than used in arithmetic: no code scales by
 * it, and that is the point. */
export const NeutralTract = 16;

/**
 * How many harmonics the glottal source carries.
 *
 * Enough to reach past F4 for the lowest notes anyone will write — 40
 * harmonics of a 65Hz low C is 2.6kHz, which is thin up there, but a voice
 * that low is a growl anyway. `OscillatorNode` band-limits a `PeriodicWave`
 * against the sample rate itself, so a high note simply drops the harmonics
 * that would alias rather than needing a smaller table.
 */
export const SourceHarmonics = 40;

/**
 * The source's spectral rolloff, as the exponent in `1/n^tilt`.
 *
 * A real glottal *flow* pulse falls at about −12 dB/octave. This is the
 * differentiated pulse that a parallel formant bank wants, which is 6 dB
 * shallower, hence 1 rather than 2. It is also the single biggest gender cue
 * in the source: a shallower tilt reads male and a steeper one reads breathy
 * and female, so it sits deliberately in the middle and is not exposed as a
 * per-phoneme knob.
 */
export const SourceTilt = 1;

/**
 * The glottal source as `PeriodicWave` coefficients.
 *
 * Sine-phase only. Real glottal pulses are not zero-phase, but phase is
 * inaudible in a sustained tone and the alternative is a waveform whose peak
 * is several times its RMS, which costs headroom for nothing.
 */
export function glottalHarmonics(count: number = SourceHarmonics): {
    real: Float32Array;
    imag: Float32Array;
} {
    const real = new Float32Array(count + 1);
    const imag = new Float32Array(count + 1);
    for (let harmonic = 1; harmonic <= count; harmonic++)
        imag[harmonic] = 1 / Math.pow(harmonic, SourceTilt);
    return { real, imag };
}

/**
 * How much breath noise rides under a voiced phoneme, as a fraction of the
 * source.
 *
 * Present at all because a glottal source with no noise in it sounds like an
 * organ rather than a throat, and small because breathiness is the other
 * classic gender cue — a breathy voice is heard as female almost regardless
 * of pitch.
 */
export const Breath = 0.06;

/** Vibrato, in Hz. A singer's is 5–7Hz; this sits in the middle. */
export const VibratoRate = 5.5;

/**
 * Vibrato depth in cents. Deliberately about a third of a trained singer's,
 * which is 60–100 cents: operatic vibrato is the sound of an adult with a
 * conservatory education, and carries an age and a gender with it.
 */
export const VibratoDepth = 22;

/** Seconds before vibrato begins, and seconds it takes to reach full depth.
 * A note that starts already wobbling sounds like a synthesizer imitating
 * vibrato; a note that grows into it sounds like breath. */
export const VibratoOnset = 0.25;
export const VibratoRamp = 0.35;

/**
 * Cents of detuning between the two glottal oscillators.
 *
 * This is the caricature made audible. Two slightly detuned larynxes is not a
 * thing a person has, and the faint chorusing it produces is the cue that
 * stops a listener resolving the sound as human — while being far too subtle
 * to read as an out-of-tune unison.
 */
export const ChorusCents = 6;

/**
 * Seconds a formant takes to travel to its next target.
 *
 * Fast enough that a consonant's transition still reads as a consonant, and
 * slow enough not to click. Deliberately a *fixed* time rather than a speed:
 * a real articulator takes longer to cross a bigger gap, and holding this
 * constant is the second thing that makes the voice read as synthetic.
 */
export const GlideSeconds = 0.035;

/** Seconds of glide into the very first phoneme of a note, which has no
 * previous target to come from and would otherwise start mid-slide. */
export const OnsetSeconds = 0.012;

/**
 * Keep F1 at or above the note's own fundamental.
 *
 * Not a realism compromise but a singing technique: when a soprano sings above
 * her first formant she raises it to meet the fundamental, because a formant
 * below f0 has no harmonic to resonate and the vowel goes hollow and quiet.
 * Doing the same here is what keeps high notes from thinning out. It is safe
 * for the neutrality goal because it responds to the *note*, not to a body —
 * it applies identically however low the voice is otherwise set.
 *
 * Capped at a fifth above the written formant so a very high note bends the
 * vowel rather than replacing it.
 */
export function tuneFirstFormant(hz: number, fundamental: number): number {
    return Math.min(Math.max(hz, fundamental * 1.05), hz * 1.5);
}

/**
 * The voice's peak gain, matching the rest of the palette.
 *
 * Derived rather than chosen, by the same method as every gain in
 * `synthesis.ts`: `scripts/instruments/voiceGain.ts` renders the chain
 * offline, measures its integrated loudness with the pipeline's own
 * ITU-R BS.1770-4 meter, and solves for the level that lands at the −33.5
 * LUFS a normalized sample plays back at.
 */
export const VoiceGain = 0.39;
