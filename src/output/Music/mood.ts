/**
 * The mood visualization, as pure math so its safety properties are testable.
 *
 * The orchestra shows *what* is playing and the light show shows *that*
 * something is playing. Neither shows what kind of piece it is: a dirge and a
 * jig make the same bars and a similar wash, because both read only the
 * instant. So this one reads the music itself — its scale, tempo, register,
 * percussion, and note lengths — and chooses a character from it, which the
 * spectrum then deforms frame to frame.
 *
 * The deformation is a genuine inverse transform: each lobe's radius is
 * `r(θ) = R(1 − D + D·w(θ))` where `w` is a sum of cosines whose amplitudes
 * are the spectrum's own bands. That is what makes this a Fourier rendering
 * expressed as form rather than as bars, and it is the whole difference from
 * the light show.
 *
 * **Two invariants carry the safety, and both are exact rather than
 * approximate.**
 *
 * *Lightness is constant.* `lightshow.ts` records an earlier design that
 * strobed, and the lesson there is that capping the rate *at* the 3Hz
 * threshold is not a margin. So hue and chroma carry everything, and the one
 * place brightness may move is fenced three separate ways (see `bloomAllowed`).
 *
 * *Ink is conserved.* Music redistributes area between lobes and deforms their
 * outlines; it never adds or removes area. `normalizeInk` holds `Σ r²` at a
 * fixed budget and the deformation is scaled to leave each lobe's mean radius
 * untouched, so no passage can brighten or darken the cloud as a whole. This
 * is the mood analogue of "it modulates colour, not brightness".
 *
 * One honest limitation: `MusicAudio` keeps a single `AnalyserNode` on the
 * master bus, so on a page with several playing stages the spectrum half of
 * this rendering shows the whole page's mix rather than this stage's. The
 * strike half is correctly per-music. The light show has the same exposure,
 * and one analyser per music is the expensive fix its comment rejects.
 */

import type { InstrumentActivity } from '@output/Music/activity';
import { instrumentSpec } from '@output/Music/instruments';
import type { MusicData } from '@output/Music/musicData';
import { analyzeMusic, notesPerSecond } from '@output/MusicSafetyAnalysis';
import {
    FlashLuminanceDelta,
    MinFlashHz,
} from '@output/PhotosensitivityAnalysis';

/* ------------------------------------------------------------------ *
 * The character of a piece
 * ------------------------------------------------------------------ */

export type Mood = {
    /** Base hue in degrees. */
    hue: number;
    /** How far hues fan across the lobes, in degrees. */
    spread: number;
    /** −1 dark … 1 bright. Kept so tests can read the axis directly. */
    valence: number;
    /** 0 round and merged … 1 angular and filamentary. */
    edge: number;
    /** 0 heaving … 1 restless. */
    drift: number;
    /** 0 … 1, churn independent of the beat. */
    turbulence: number;
    /** 0 … 1, how high the cloud reaches. */
    lift: number;
    /** Resting chroma, from loudness. */
    chroma: number;
    /** 0 … 1, how many lobes carry more than a token share of ink. */
    density: number;
    /** 0 … 1, how closed the drift orbits are — a loop is a cycle. */
    cyclic: number;
    /** Whether brightness may breathe at all. */
    bloom: boolean;
};

/** Always this many lobes, whatever the music. Forty tracks is not forty
 * lobes; it is a wide `spread` and a dense `edge`. Holding the count fixed is
 * what makes the paint cost independent of track count, and it also lets a
 * change in `density` be pure ink redistribution rather than a lobe appearing
 * out of nothing. */
export const Lobes = 9;
/** Cosine terms in the outline. Six is enough to read as complex and cheap
 * enough to evaluate per vertex. */
export const Harmonics = 6;

/** The hues the mood axis runs between, as an arc through magenta rather than
 * a straight line, so the middle of the range isn't a muddy teal. */
export const DarkHue = 265;
export const MidHue = 330;
export const BrightHue = 45;

/** Fixed lightness in LCH percent, exactly as the light show fixes it. */
export const BaseLightness = 54;
/** Points of lightness the bloom may add, and only when it is allowed. Under
 * `FlashLuminanceDelta` (0.1, ten points in these units) on its own. */
export const BloomLightness = 6;
export const RestChroma = 18;
export const PeakChroma = 88;
/** The most opaque a single lobe gets. Constant: alpha is not a channel the
 * music is allowed to write to, or ink would stop being conserved. */
export const LobeAlpha = 0.34;

/** Seconds for the cloud to reach a newly chosen character. */
export const MoodEaseSeconds = 1.2;
/** Bloom envelope. A full breathe in and out takes at least the sum of these,
 * which is the second of the three fences on brightness. */
export const BloomRiseSeconds = 0.35;
export const BloomFallSeconds = 1.2;
/** Percussive transient and legato envelopes. */
export const HitFallSeconds = 0.18;
export const SustainRiseSeconds = 0.25;
export const SustainFallSeconds = 0.9;

/** The bloom is unlocked only this far below the seizure band — a third of
 * it, because the light show learned that sitting at a threshold is not a
 * margin. */
export const BloomMaxHz = MinFlashHz / 3;

/** Deepest the outline may deform. Bounded so a lobe can never pinch to
 * nothing, which would be an on/off flash at note rate. */
export const MaxDeform = 0.34;
/** No lobe may fall below this share of the ink, for the same reason. */
export const MinShare = 0.04;
/** Total `Σ r²` across the lobes, in units of the band's height. Music moves
 * ink between lobes; it never changes this. */
export const InkBudget = 0.5;

/** Notes sampled per track when reading a piece's character. A summary
 * statistic doesn't need every note, and a 128-track import must not cost a
 * millisecond an evaluation. */
const SampleNotes = 256;

const SlowTempo = 50;
const FastTempo = 200;
const ShortNote = 0.25;
const LongNote = 4;
const ComfortableTracks = 12;

function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

function span(value: number, low: number, high: number): number {
    return high === low ? 0 : clamp01((value - low) / (high - low));
}

/**
 * How bright a scale sounds, −1 dark to 1 bright.
 *
 * Read from the intervals that carry mood rather than from the scale's name,
 * so a creator's hand-written `[0semitones 3semitones …]` is judged the same
 * as a built-in one. A scale holding both thirds — chromatic — commits to
 * neither and lands near zero, which is right.
 */
export function scaleValence(scale: readonly number[]): number {
    const classes = new Set(scale.map((offset) => ((offset % 12) + 12) % 12));
    const has = (semitone: number) => (classes.has(semitone) ? 1 : 0);
    let valence = 0;
    // The axis: major third against minor third.
    valence += (has(4) - has(3)) * 0.5;
    // A flat second is what makes phrygian darker than plain minor.
    valence -= has(1) * 0.2;
    // The one interval separating dorian from aeolian.
    valence += (has(9) - has(8)) * 0.15;
    // A leading tone lifts; a flat seventh doesn't.
    valence += (has(11) - has(10)) * 0.1;
    // No perfect fifth means no tonal floor to stand on — locrian, altered.
    valence -= (1 - has(7)) * 0.2;
    return Math.min(1, Math.max(-1, valence));
}

/** Whether every gap between adjacent scale steps is the same, which means
 * there is no tonic to settle on. Whole tone and diminished read as unsettled
 * rather than as happy merely for lacking a minor third. */
function isSymmetric(scale: readonly number[]): boolean {
    if (scale.length < 3) return false;
    const sorted = [...scale].sort((a, b) => a - b);
    const first = sorted[1] - sorted[0];
    for (let i = 2; i < sorted.length; i++)
        if (Math.abs(sorted[i] - sorted[i - 1] - first) > 0.001) return false;
    return true;
}

/** Level-weighted circular mean of hues, so an ensemble reads as one colour.
 * Deliberately a local copy of the same five lines in `lightshow.blastFor`:
 * two independent visualizations sharing a helper would couple them for no
 * gain. */
function meanHue(entries: readonly { hue: number; weight: number }[]): number {
    let x = 0;
    let y = 0;
    let total = 0;
    for (const entry of entries) {
        const radians = (entry.hue * Math.PI) / 180;
        x += Math.cos(radians) * entry.weight;
        y += Math.sin(radians) * entry.weight;
        total += entry.weight;
    }
    if (total <= 0) return 0;
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Hue for a valence, along the dark → magenta → bright arc. */
export function hueForValence(valence: number): number {
    const t = (valence + 1) / 2;
    return t < 0.5
        ? DarkHue + (MidHue - DarkHue) * (t / 0.5)
        : MidHue + (BrightHue + 360 - MidHue) * ((t - 0.5) / 0.5);
}

/** What the cloud is with nothing playing: still, cool, and thin. */
export function restingMood(): Mood {
    return {
        hue: 250,
        spread: 40,
        valence: 0,
        edge: 0.15,
        drift: 0.12,
        turbulence: 0.1,
        lift: 0.3,
        chroma: RestChroma,
        density: 0.25,
        cyclic: 0.5,
        bloom: false,
    };
}

/** The character of everything on stage, read once per evaluation. */
export function analyzeMood(musics: readonly MusicData[]): Mood {
    const tracks = musics.flatMap((music) =>
        music.tracks.map((track) => ({ music, track })),
    );
    if (tracks.length === 0) return restingMood();

    let valenceSum = 0;
    let valenceWeight = 0;
    let unsettled = 0;
    let tempoSum = 0;
    let beats = 0;
    let beatSquares = 0;
    let sounding = 0;
    let percussive = 0;
    let levelSum = 0;
    let looping = 0;
    let degreeSum = 0;
    let degreeCount = 0;
    const hues: { hue: number; weight: number }[] = [];

    for (const { music, track } of tracks) {
        const spec = instrumentSpec(track.instrument);
        const pitched = spec?.pitched !== false;
        tempoSum += music.tempo;
        if (track.loop) looping++;

        let trackSounding = 0;
        const notes = track.notes.slice(0, SampleNotes);
        for (const note of notes) {
            if (note.degrees.length === 0) continue;
            trackSounding++;
            beats += note.beats;
            beatSquares += note.beats * note.beats;
            levelSum += note.volume * track.volume * music.volume;
            for (const degree of note.degrees) {
                degreeSum += degree;
                degreeCount++;
            }
        }
        sounding += trackSounding;
        if (!pitched) percussive += trackSounding;

        // Weight a track's scale by how much it actually plays, so a one-note
        // drone doesn't outvote the melody above it.
        const weight = Math.max(1, trackSounding);
        valenceSum += scaleValence(track.scale) * weight;
        valenceWeight += weight;
        if (isSymmetric(track.scale)) unsettled += weight;
        hues.push({ hue: spec?.hue ?? 250, weight });
    }

    const valence = valenceWeight === 0 ? 0 : valenceSum / valenceWeight;
    const meanTempo = tempoSum / tracks.length;
    // Log-scaled, so 60→120 and 120→240 move the drift by the same amount.
    const pace = span(
        Math.log(Math.max(1, meanTempo)),
        Math.log(SlowTempo),
        Math.log(FastTempo),
    );
    const meanBeats = sounding === 0 ? 1 : beats / sounding;
    const variance =
        sounding === 0
            ? 0
            : Math.max(0, beatSquares / sounding - meanBeats * meanBeats);
    const percussionShare = sounding === 0 ? 0 : percussive / sounding;
    const staccato = 1 - span(meanBeats, ShortNote, LongNote);
    const symmetry = valenceWeight === 0 ? 0 : unsettled / valenceWeight;
    const meanDegree = degreeCount === 0 ? 0 : degreeSum / degreeCount;
    const meanLevel = sounding === 0 ? 0.5 : levelSum / sounding;

    // Instrument colour and mood colour each carry about half; a piano piece
    // and a guitar piece in the same scale should not look identical.
    const moodHue = hueForValence(valence);
    const hue = meanHue([
        { hue: moodHue, weight: 0.55 },
        { hue: meanHue(hues), weight: 0.45 },
    ]);

    return {
        hue,
        spread: 20 + span(variance, 0, 2) * 60 + symmetry * 40,
        valence,
        edge: clamp01(
            percussionShare * 0.35 + staccato * 0.4 + symmetry * 0.25,
        ),
        drift: pace,
        turbulence: clamp01(pace * 0.3 + staccato * 0.3 + symmetry * 0.2),
        lift: span(meanDegree, -18, 18),
        chroma: RestChroma + (PeakChroma - RestChroma) * clamp01(meanLevel),
        density: span(
            Math.log2(1 + tracks.length),
            0,
            Math.log2(1 + ComfortableTracks),
        ),
        cyclic: looping / tracks.length,
        bloom: bloomAllowed(musics),
    };
}

/* ------------------------------------------------------------------ *
 * The bloom gate — three independent fences on brightness
 * ------------------------------------------------------------------ */

/**
 * Whether brightness may breathe at all.
 *
 * Fence one of three, and the static one: every track of every music must be
 * slower than a third of the seizure-band floor. It also asks the existing
 * safety analysis directly, which is redundant with the rate test on purpose —
 * that ties this gate to the repo's published definition of a dangerous pulse,
 * so if that threshold ever moves, this moves with it.
 *
 * Denies by default. Static analysis cannot see reactive music that speeds up
 * later, which is exactly why the magnitude fence exists and why it is the one
 * that must never be removed.
 */
export function bloomAllowed(musics: readonly MusicData[]): boolean {
    if (musics.length === 0) return false;
    for (const music of musics) {
        if (analyzeMusic(music).has('pulse')) return false;
        for (const track of music.tracks)
            if (notesPerSecond(music, track) > BloomMaxHz) return false;
    }
    return true;
}

/**
 * How much relative luminance the rendering can move between rest and a full
 * hit — fence three, the magnitude, modelled the way `lightshow.luminanceSwing`
 * models it. Chroma at constant lightness contributes a second-order amount;
 * the bloom contributes directly.
 */
export function luminanceSwing(bloom: boolean): number {
    const chromaEffect = ((PeakChroma - RestChroma) / 100) * 0.05;
    const bloomEffect = bloom ? BloomLightness / 100 : 0;
    return (chromaEffect + bloomEffect) * LobeAlpha;
}

/* ------------------------------------------------------------------ *
 * Easing
 * ------------------------------------------------------------------ */

function toward(current: number, target: number, step: number): number {
    return current + (target - current) * step;
}

/** Glide toward a newly chosen character. Nothing here may change in a step:
 * a step change in anything reads as a flash, and it is also what would make
 * a rising tempo look like a twitch instead of acceleration. */
export function easeMood(
    current: Mood,
    target: Mood,
    elapsedSeconds: number,
): Mood {
    const step = Math.min(1, elapsedSeconds / MoodEaseSeconds);
    // Hue takes the short way around, so a swap from red to purple doesn't
    // sweep the whole wheel.
    let delta = target.hue - current.hue;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return {
        hue: (current.hue + delta * step + 360) % 360,
        spread: toward(current.spread, target.spread, step),
        valence: toward(current.valence, target.valence, step),
        edge: toward(current.edge, target.edge, step),
        drift: toward(current.drift, target.drift, step),
        turbulence: toward(current.turbulence, target.turbulence, step),
        lift: toward(current.lift, target.lift, step),
        chroma: toward(current.chroma, target.chroma, step),
        density: toward(current.density, target.density, step),
        cyclic: toward(current.cyclic, target.cyclic, step),
        // Not eased: it is a permission, and the envelope below is what makes
        // acting on it gradual.
        bloom: target.bloom,
    };
}

/* ------------------------------------------------------------------ *
 * The runtime pulse
 * ------------------------------------------------------------------ */

export type Pulse = {
    /** Ink share per lobe, floored and summing to 1. */
    shares: number[];
    /** Radial deformation amplitudes, one per harmonic. */
    harmonics: number[];
    /** Slowly rotating, so the outline never freezes. */
    phases: number[];
    /** 0-1 summed band energy. */
    drive: number;
    /** 0-1 percussive transient. */
    hit: number;
    /** 0-1 legato-ness, from how long notes are sounding. */
    sustain: number;
    /** Degrees offset from the mood's base hue, from the spectral centroid. */
    driftHue: number;
    /** Radians, advanced by drift. */
    orbit: number;
    /** 0-1. Always 0 unless the gate is open, and always ramped. */
    bloom: number;
};

export function restingPulse(): Pulse {
    return {
        shares: normalizeShares(new Array<number>(Lobes).fill(1)),
        harmonics: new Array<number>(Harmonics).fill(0),
        // Staggered, so the lobes don't all deform in unison on the first frame.
        phases: Array.from({ length: Harmonics }, (_, k) => k * 1.7),
        drive: 0,
        hit: 0,
        sustain: 0.5,
        driftHue: 0,
        orbit: 0,
        bloom: 0,
    };
}

/** What just sounded, collapsed to one blow. Undefined for silence, the same
 * contract `lightshow.blastFor` keeps. */
export type Blow = {
    level: number;
    hue: number;
    /** 0-1 where in the register it sat. */
    pitch: number;
    /** 0-1 share of this instant that was unpitched. */
    percussion: number;
    /** Longest note sounding, in seconds; 0 when unknown. */
    seconds: number;
    pan: number;
};

export function summarize(
    fresh: readonly InstrumentActivity[],
): Blow | undefined {
    if (fresh.length === 0) return undefined;
    let level = 0;
    let percussive = 0;
    let seconds = 0;
    let pan = 0;
    let degree = 0;
    const hues: { hue: number; weight: number }[] = [];
    for (const entry of fresh) {
        const spec = instrumentSpec(entry.instrument);
        level = Math.max(level, clamp01(entry.level));
        if (spec?.pitched === false) percussive++;
        seconds = Math.max(seconds, entry.seconds ?? 0);
        pan += entry.pan;
        degree += entry.degree;
        hues.push({
            hue: spec?.hue ?? 250,
            weight: Math.max(0.001, entry.level),
        });
    }
    return {
        level,
        hue: meanHue(hues),
        pitch: span(degree / fresh.length, -18, 18),
        percussion: percussive / fresh.length,
        seconds,
        pan: Math.min(1, Math.max(-1, pan / fresh.length)),
    };
}

/** Where the spectrum's energy sits, 0 bass to 1 treble. */
export function bandCentroid(bands: readonly number[]): number {
    let weighted = 0;
    let total = 0;
    for (let i = 0; i < bands.length; i++) {
        weighted += i * bands[i];
        total += bands[i];
    }
    return total <= 0 || bands.length < 2
        ? 0.5
        : weighted / total / (bands.length - 1);
}

/** Exponential approach, framed as a time constant rather than a per-frame
 * fraction so the result doesn't depend on frame rate. */
function approach(
    current: number,
    target: number,
    seconds: number,
    elapsedSeconds: number,
): number {
    if (seconds <= 0) return target;
    return current + (target - current) * Math.min(1, elapsedSeconds / seconds);
}

/**
 * One frame of the continuous half: take the spectrum, move the envelopes,
 * turn the orbit. Time is a parameter so this steps deterministically in a
 * test with no clock and no browser.
 */
export function advance(
    pulse: Pulse,
    mood: Mood,
    bands: readonly number[],
    elapsedSeconds: number,
    still: boolean,
): Pulse {
    // Ink share per lobe, from the low-to-high spectrum.
    const shares = normalizeShares(
        Array.from({ length: Lobes }, (_, lobe) =>
            bands.length === 0
                ? 1 / Lobes
                : (bands[Math.min(bands.length - 1, lobe)] ?? 0),
        ),
    );

    // Harmonic amplitudes, with `edge` deciding whether the energy sits in
    // the low terms (round lobes) or the high ones (spikes).
    const harmonics = pulse.harmonics.map((current, k) => {
        const source =
            bands.length === 0
                ? 0
                : (bands[Math.min(bands.length - 1, k * 2)] ?? 0);
        const bias = Math.pow((k + 1) / Harmonics, mood.edge * 2 - 1);
        return approach(current, source * bias, 0.12, elapsedSeconds);
    });

    let drive = 0;
    for (const band of bands) drive += band;
    drive = bands.length === 0 ? 0 : clamp01(drive / bands.length);

    const centroid = bandCentroid(bands);
    return {
        shares,
        harmonics,
        phases: still
            ? pulse.phases
            : pulse.phases.map(
                  (phase, k) =>
                      phase +
                      elapsedSeconds *
                          (0.12 + k * 0.04) *
                          (0.4 + mood.turbulence),
              ),
        drive: approach(pulse.drive, drive, 0.1, elapsedSeconds),
        hit: approach(pulse.hit, 0, HitFallSeconds, elapsedSeconds),
        // Legato-ness relaxes toward the middle between notes, so a piece that
        // stops doesn't stay frozen as whatever its last note happened to be.
        sustain: approach(
            pulse.sustain,
            0.5,
            SustainFallSeconds * 4,
            elapsedSeconds,
        ),
        driftHue: approach(
            pulse.driftHue,
            (centroid - 0.5) * 80,
            0.4,
            elapsedSeconds,
        ),
        orbit: still
            ? pulse.orbit
            : pulse.orbit + elapsedSeconds * (0.15 + mood.drift * 0.6),
        // The bloom only ever ramps, which is fence two: a full cycle cannot
        // complete faster than the rise plus the fall, whatever the music does.
        bloom: approach(
            pulse.bloom,
            mood.bloom && !still ? clamp01(drive) : 0,
            mood.bloom && !still ? BloomRiseSeconds : BloomFallSeconds,
            elapsedSeconds,
        ),
    };
}

/** The discrete half: fold a blow into the pulse. */
export function strike(pulse: Pulse, mood: Mood, blow: Blow): Pulse {
    return {
        ...pulse,
        hit: Math.max(pulse.hit, blow.level * (0.4 + blow.percussion * 0.6)),
        // A long note pulls toward legato, a short one away from it. Attack is
        // faster than release so a phrase settles rather than flickering.
        sustain: approach(
            pulse.sustain,
            clamp01(blow.seconds / 1.5),
            blow.seconds > 0.5 ? SustainRiseSeconds : SustainFallSeconds,
            SustainRiseSeconds,
        ),
        driftHue: pulse.driftHue + (blow.pitch - 0.5) * 20 * blow.level,
        orbit: pulse.orbit + blow.level * 0.12 * (0.5 + mood.drift),
    };
}

/* ------------------------------------------------------------------ *
 * Geometry, and the ink invariant
 * ------------------------------------------------------------------ */

/** Floor every share so no lobe can reach zero and vanish — a lobe blinking
 * out and back at note rate would be an on/off flash — then renormalize. */
export function normalizeShares(raw: readonly number[]): number[] {
    let total = 0;
    for (const value of raw) total += Math.max(0, value);
    const even = 1 / raw.length;
    const shares = raw.map((value) =>
        total <= 0 ? even : Math.max(0, value) / total,
    );
    return shares.map(
        (share) => MinShare + (1 - raw.length * MinShare) * share,
    );
}

/** Mean radii for a set of shares, holding `Σ r²` at `InkBudget` exactly. */
export function normalizeInk(shares: readonly number[]): number[] {
    let sum = 0;
    for (const share of shares) sum += share;
    const target = shares.map((share) =>
        sum <= 0 ? 1 / shares.length : share / sum,
    );
    let squares = 0;
    for (const share of target) squares += share * share;
    const scale = Math.sqrt(InkBudget / squares);
    return target.map((share) => share * scale);
}

/** `Σ r²`, the quantity music is not allowed to change. */
export function inkOf(radii: readonly number[]): number {
    let sum = 0;
    for (const radius of radii) sum += radius * radius;
    return sum;
}

/** How deep the outline deforms this frame, bounded so a lobe can never
 * pinch shut. Sustained music smooths it; a percussive hit shatters it. */
export function deformOf(mood: Mood, pulse: Pulse): number {
    const raw = 0.1 + mood.edge * 0.5 + pulse.hit * 0.5 - pulse.sustain * 0.25;
    return Math.min(MaxDeform, Math.max(0, raw));
}

/**
 * The radius of a lobe at an angle.
 *
 * `w(θ)` is a normalized sum of cosines — the inverse transform of the
 * spectrum onto the radius — with a mean of exactly 0.5 over a full turn.
 * Dividing by `(1 − D/2)` is what makes the *mean* radius come out at exactly
 * `base` whatever the deformation depth, which is what keeps ink conserved
 * when the music gets spikier.
 */
export function lobeRadius(
    base: number,
    deform: number,
    harmonics: readonly number[],
    phases: readonly number[],
    theta: number,
): number {
    let sum = 0;
    let weight = 0;
    for (let k = 0; k < harmonics.length; k++) {
        const amplitude = Math.max(0, harmonics[k]);
        sum += amplitude * Math.cos((k + 1) * theta + (phases[k] ?? 0));
        weight += amplitude;
    }
    const w = weight <= 0 ? 0.5 : 0.5 + 0.5 * (sum / weight);
    return (base / (1 - deform / 2)) * (1 - deform + deform * w);
}

/** The colour of a lobe. `lightness` is the only channel with a safety
 * property, and this is the only function that writes it. */
export function lobeColor(
    mood: Mood,
    pulse: Pulse,
    lobe: number,
): { lightness: number; chroma: number; hue: number; alpha: number } {
    const offset = lobe / (Lobes - 1) - 0.5;
    return {
        lightness: BaseLightness + BloomLightness * clamp01(pulse.bloom),
        chroma: Math.min(
            PeakChroma,
            mood.chroma + (PeakChroma - mood.chroma) * clamp01(pulse.drive),
        ),
        hue: (mood.hue + offset * mood.spread + pulse.driftHue + 720) % 360,
        alpha: LobeAlpha,
    };
}

export function colorToCSS(color: {
    lightness: number;
    chroma: number;
    hue: number;
    alpha: number;
}): string {
    return `lch(${color.lightness.toFixed(1)}% ${Math.round(color.chroma)} ${Math.round(color.hue)}deg / ${color.alpha.toFixed(3)})`;
}

/** Where a lobe's centre sits this frame, 0-1 across and up the band. The
 * orbit closes on itself when the music loops and never repeats when it
 * doesn't, which is a musical fact nothing else in the app shows. */
export function lobeCentre(
    mood: Mood,
    pulse: Pulse,
    lobe: number,
): { x: number; y: number } {
    const base = lobe / (Lobes - 1);
    // Rational ratios close the path; irrational ones never do.
    const ratio = mood.cyclic * 2 + (1 - mood.cyclic) * Math.SQRT2;
    const phase = pulse.orbit + lobe * 0.7;
    const swing = 0.06 + mood.turbulence * 0.08;
    return {
        x: clamp01(base + Math.cos(phase) * swing),
        y: clamp01(
            0.15 +
                mood.lift * 0.5 +
                Math.sin(phase * ratio) * swing +
                pulse.drive * 0.1,
        ),
    };
}

/** Re-exported so the bound and the thing it's bounded by stay in one place. */
export { FlashLuminanceDelta, MinFlashHz };
