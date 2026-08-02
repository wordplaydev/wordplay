import { expect, test } from 'vitest';
import type { InstrumentActivity } from '@output/Music/activity';
import type { MusicData, TrackData } from '@output/Music/musicData';
import { Scales } from '@output/Music/scales';
import { analyzeMusic } from '@output/MusicSafetyAnalysis';
import {
    advance,
    analyzeMood,
    BaseLightness,
    BloomFallSeconds,
    BloomLightness,
    BloomMaxHz,
    BloomRiseSeconds,
    bloomAllowed,
    colorToCSS,
    deformOf,
    easeMood,
    FlashLuminanceDelta,
    inkOf,
    InkBudget,
    Lobes,
    lobeColor,
    lobeRadius,
    luminanceSwing,
    MaxDeform,
    MinFlashHz,
    normalizeInk,
    normalizeShares,
    restingMood,
    restingPulse,
    scaleValence,
    strike,
    summarize,
} from '@output/Music/mood';

/* ---------------------------------------------------------------- *
 * Builders
 * ---------------------------------------------------------------- */

function track(options: Partial<TrackData> = {}): TrackData {
    return {
        notes: [{ degrees: [1], beats: 1, volume: 1 }],
        instrument: 'piano',
        scale: Scales.major,
        key: 0,
        volume: 1,
        pan: 0,
        loop: true,
        ...options,
    };
}

function music(options: Partial<MusicData> = {}): MusicData {
    return {
        name: 'test',
        tempo: 120,
        volume: 1,
        key: 0,
        scale: Scales.major,
        replay: false,
        description: undefined,
        tracks: [track()],
        ...options,
    };
}

/** A track of `count` notes each `beats` long, so onset rate is controllable. */
function run(beats: number, count = 8, options: Partial<TrackData> = {}) {
    return track({
        notes: Array.from({ length: count }, () => ({
            degrees: [1],
            beats,
            volume: 1,
        })),
        ...options,
    });
}

function sounding(
    instrument: string,
    level: number,
    extra: Partial<InstrumentActivity> = {},
): InstrumentActivity {
    return {
        instrument,
        level,
        degree: 1,
        pan: 0,
        track: 0,
        strike: 1,
        ...extra,
    };
}

/* ---------------------------------------------------------------- *
 * Character
 * ---------------------------------------------------------------- */

test('a minor scale reads darker than a major one', () => {
    expect(scaleValence(Scales.minor)).toBeLessThan(0);
    expect(scaleValence(Scales.major)).toBeGreaterThan(0);
});

test('phrygian is darker than plain minor, lydian brighter than major', () => {
    expect(scaleValence(Scales.phrygian)).toBeLessThan(
        scaleValence(Scales.minor),
    );
    expect(scaleValence(Scales.lydian)).toBeGreaterThanOrEqual(
        scaleValence(Scales.major),
    );
});

test('dorian sits between minor and major, on the one interval that differs', () => {
    expect(scaleValence(Scales.dorian)).toBeGreaterThan(
        scaleValence(Scales.minor),
    );
    expect(scaleValence(Scales.dorian)).toBeLessThan(scaleValence(Scales.major));
});

test('chromatic is ambivalent, because it holds both thirds', () => {
    expect(Math.abs(scaleValence(Scales.chromatic))).toBeLessThan(0.35);
});

test('scales with no fifth to stand on read dark', () => {
    // Locrian's tritone-for-a-fifth is what makes it unsettled, not its third.
    expect(scaleValence(Scales.locrian)).toBeLessThan(scaleValence(Scales.minor));
});

test('symmetric scales read as unsettled rather than as happy', () => {
    // Whole tone has a major third and no minor one, so a third-only reading
    // would call it cheerful. It has no tonic at all.
    const whole = analyzeMood([music({ tracks: [track({ scale: Scales.wholeTone })] })]);
    const major = analyzeMood([music({ tracks: [track({ scale: Scales.major })] })]);
    expect(whole.edge).toBeGreaterThan(major.edge);
    expect(whole.spread).toBeGreaterThan(major.spread);
});

test('tempo drives drift logarithmically, so each doubling moves it alike', () => {
    // Sampled inside the mapped range; outside it the clamp dominates, which
    // is intended — a piece at 400bpm is not twice as restless as one at 200.
    const driftAt = (tempo: number) => analyzeMood([music({ tempo })]).drift;
    const low = driftAt(100) - driftAt(50);
    const high = driftAt(200) - driftAt(100);
    expect(Math.abs(low - high)).toBeLessThan(0.02);
    // And the clamp really does hold past the top.
    expect(driftAt(400)).toBe(driftAt(200));
});

test('percussion is angular and a pad is round', () => {
    const drums = analyzeMood([
        music({ tracks: [track({ instrument: 'drums' })] }),
    ]);
    const pad = analyzeMood([
        music({ tracks: [track({ instrument: 'synthPad', notes: [{ degrees: [1], beats: 4, volume: 1 }] })] }),
    ]);
    expect(drums.edge).toBeGreaterThan(pad.edge);
});

test('staccato is edgier than sustained', () => {
    const short = analyzeMood([music({ tracks: [run(0.25)] })]);
    const long = analyzeMood([music({ tracks: [run(4)] })]);
    expect(short.edge).toBeGreaterThan(long.edge);
});

test('mixed note lengths spread the colour wider than even ones', () => {
    const even = analyzeMood([music({ tracks: [run(1, 8)] })]);
    const mixed = analyzeMood([
        music({
            tracks: [
                track({
                    notes: [
                        { degrees: [1], beats: 0.25, volume: 1 },
                        { degrees: [1], beats: 4, volume: 1 },
                        { degrees: [1], beats: 0.25, volume: 1 },
                        { degrees: [1], beats: 4, volume: 1 },
                    ],
                }),
            ],
        }),
    ]);
    expect(mixed.spread).toBeGreaterThan(even.spread);
});

test('the instrument reaches the colour, so two palettes differ', () => {
    const piano = analyzeMood([music({ tracks: [track({ instrument: 'piano' })] })]);
    const guitar = analyzeMood([
        music({ tracks: [track({ instrument: 'guitar' })] }),
    ]);
    expect(Math.abs(piano.hue - guitar.hue)).toBeGreaterThan(5);
});

test('forty tracks is not forty lobes', () => {
    const many = analyzeMood([
        music({ tracks: Array.from({ length: 40 }, () => track()) }),
    ]);
    // Density saturates; the lobe count is a constant, which is what keeps
    // the paint cost independent of how much music is playing.
    expect(Lobes).toBe(9);
    expect(many.density).toBeLessThanOrEqual(1);
    expect(restingPulse().shares.length).toBe(Lobes);
});

test('empty and degenerate music still produce a valid mood', () => {
    for (const mood of [
        analyzeMood([]),
        analyzeMood([music({ tracks: [] })]),
        analyzeMood([music({ tracks: [track({ notes: [], scale: [] })] })]),
    ])
        for (const [key, value] of Object.entries(mood))
            if (typeof value === 'number')
                expect(Number.isFinite(value), `${key} is ${value}`).toBe(true);
});

/* ---------------------------------------------------------------- *
 * Safety: ink is conserved
 * ---------------------------------------------------------------- */

test('no music can brighten or darken the cloud: ink is conserved', () => {
    // A deterministic pseudo-random sweep of spectra and deformations.
    let seed = 7;
    const next = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let round = 0; round < 200; round++) {
        const raw = Array.from({ length: Lobes }, () => next() * next() * 4);
        const radii = normalizeInk(normalizeShares(raw));
        expect(inkOf(radii)).toBeCloseTo(InkBudget, 9);
    }
});

test('deforming the outline does not change how much ink a lobe carries', () => {
    // The mean radius over a full turn must not depend on the depth, or a
    // spikier passage would be a dimmer one.
    const harmonics = [1, 0.6, 0.3, 0.2, 0.1, 0.05];
    const phases = [0, 1, 2, 3, 4, 5];
    const meanAt = (deform: number) => {
        let total = 0;
        const steps = 2048;
        for (let i = 0; i < steps; i++)
            total += lobeRadius(
                0.3,
                deform,
                harmonics,
                phases,
                (i / steps) * Math.PI * 2,
            );
        return total / steps;
    };
    expect(meanAt(0)).toBeCloseTo(0.3, 3);
    expect(meanAt(MaxDeform)).toBeCloseTo(0.3, 3);
    expect(meanAt(0.2)).toBeCloseTo(0.3, 3);
});

test('a lobe can never pinch shut, so it cannot blink on and off', () => {
    const harmonics = [1, 1, 1, 1, 1, 1];
    const phases = [0, 0, 0, 0, 0, 0];
    let smallest = Infinity;
    for (let i = 0; i < 720; i++)
        smallest = Math.min(
            smallest,
            lobeRadius(0.3, MaxDeform, harmonics, phases, (i / 720) * Math.PI * 2),
        );
    expect(smallest).toBeGreaterThan(0.3 * 0.5);
});

test('no lobe may lose all its share', () => {
    const shares = normalizeShares([1, 0, 0, 0, 0, 0, 0, 0, 0]);
    for (const share of shares) expect(share).toBeGreaterThan(0);
    expect(deformOf(restingMood(), restingPulse())).toBeLessThanOrEqual(MaxDeform);
});

/* ---------------------------------------------------------------- *
 * Safety: brightness, fenced three ways
 * ---------------------------------------------------------------- */

test('with the bloom closed, lightness never moves whatever the music does', () => {
    const mood = { ...restingMood(), bloom: false };
    const pulse = restingPulse();
    const quiet = lobeColor(mood, { ...pulse, bloom: 0, drive: 0 }, 0);
    const loud = lobeColor(mood, { ...pulse, bloom: 0, drive: 1 }, Lobes - 1);
    expect(quiet.lightness).toBe(BaseLightness);
    expect(loud.lightness).toBe(BaseLightness);
    expect(colorToCSS(quiet)).toContain(`lch(${BaseLightness.toFixed(1)}%`);
    expect(colorToCSS(loud)).toContain(`lch(${BaseLightness.toFixed(1)}%`);
});

test('alpha is a constant, so the music cannot fade the cloud in and out', () => {
    const mood = restingMood();
    const pulse = restingPulse();
    const quiet = lobeColor(mood, { ...pulse, drive: 0 }, 0);
    const loud = lobeColor(mood, { ...pulse, drive: 1 }, 0);
    expect(quiet.alpha).toBe(loud.alpha);
});

test('fence one: the gate denies by default and keeps a real margin', () => {
    // The light show learned that sitting *at* a threshold is not a margin.
    expect(BloomMaxHz).toBeLessThanOrEqual(MinFlashHz / 3);
    expect(bloomAllowed([])).toBe(false);
});

test('fence one: the gate agrees with the safety analysis about a pulse', () => {
    for (const tempo of [60, 120, 180, 240])
        for (const beats of [0.125, 0.25, 0.5, 1, 2, 4]) {
            const piece = music({ tempo, tracks: [run(beats)] });
            if (analyzeMusic(piece).has('pulse'))
                expect(
                    bloomAllowed([piece]),
                    `${tempo}bpm at ${beats} beats is a pulse but blooms`,
                ).toBe(false);
        }
});

test('fence one: one fast music denies the whole stage', () => {
    const slow = music({ tempo: 60, tracks: [run(4)] });
    const fast = music({ name: 'fast', tempo: 240, tracks: [run(0.125)] });
    expect(bloomAllowed([slow])).toBe(true);
    expect(bloomAllowed([slow, fast])).toBe(false);
});

test('fence two: the envelope alone cannot reach the seizure band', () => {
    // Whatever the input does, a full breathe in and out takes this long, so
    // brightness physically cannot oscillate at 3Hz even if the gate were wrong.
    const cycleHz = 1 / (BloomRiseSeconds + BloomFallSeconds);
    expect(cycleHz).toBeLessThan(MinFlashHz / 3);
});

test('fence three: the magnitude is under the flash threshold either way', () => {
    expect(luminanceSwing(false)).toBeLessThan(FlashLuminanceDelta);
    expect(luminanceSwing(true)).toBeLessThan(FlashLuminanceDelta);
    expect(luminanceSwing(false)).toBeLessThan(luminanceSwing(true));
    // And the bloom's own contribution, before opacity, is under it too.
    expect(BloomLightness / 100).toBeLessThan(FlashLuminanceDelta);
});

test('the bloom closes gradually, because a step to dark is a change too', () => {
    const open = { ...restingMood(), bloom: true };
    const shut = { ...restingMood(), bloom: false };
    let pulse = { ...restingPulse(), bloom: 1 };
    pulse = advance(pulse, shut, [1, 1, 1], 0.016, false);
    expect(pulse.bloom).toBeGreaterThan(0.9);
    expect(pulse.bloom).toBeLessThan(1);
    // And opening is a ramp too.
    let rising = restingPulse();
    rising = advance(rising, open, [1, 1, 1], 0.016, false);
    expect(rising.bloom).toBeLessThan(0.2);
});

/* ---------------------------------------------------------------- *
 * Evolution
 * ---------------------------------------------------------------- */

test('a mood change is never a step', () => {
    const from = restingMood();
    const to = { ...restingMood(), hue: 40, drift: 1, edge: 1, spread: 120 };
    const after = easeMood(from, to, 0.016);
    expect(Math.abs(after.drift - from.drift)).toBeLessThan(0.1);
    expect(Math.abs(after.edge - from.edge)).toBeLessThan(0.1);
});

test('hue takes the short way around the wheel', () => {
    const from = { ...restingMood(), hue: 350 };
    const to = { ...restingMood(), hue: 10 };
    // A full step should land on 10, not have swept down through 180.
    const after = easeMood(from, to, 100);
    expect(after.hue).toBeCloseTo(10, 3);
    // A small step should move up past 360 rather than down.
    const nudged = easeMood(from, to, 0.3);
    expect(nudged.hue > 350 || nudged.hue < 10).toBe(true);
});

test('silence produces no blow', () => {
    expect(summarize([])).toBeUndefined();
});

test('a blow takes the colour and force of what just played', () => {
    const blow = summarize([sounding('piano', 1)]);
    // Piano's hue is 260.
    expect(blow?.hue).toBeCloseTo(260, 0);
    expect(blow?.level).toBe(1);
    expect(blow?.percussion).toBe(0);
});

test('percussion is recognised as percussion', () => {
    expect(summarize([sounding('drums', 1)])?.percussion).toBe(1);
    expect(
        summarize([sounding('drums', 1), sounding('piano', 1)])?.percussion,
    ).toBeCloseTo(0.5);
});

test('a longer note pulls the form toward legato', () => {
    const mood = restingMood();
    const short = strike(restingPulse(), mood, {
        ...summarize([sounding('piano', 1, { seconds: 0.1 })])!,
    });
    const long = strike(restingPulse(), mood, {
        ...summarize([sounding('piano', 1, { seconds: 2 })])!,
    });
    expect(long.sustain).toBeGreaterThan(short.sustain);
    // And legato smooths the outline while a hit shatters it.
    expect(deformOf(mood, long)).toBeLessThan(deformOf(mood, short));
});

test('at reduced motion the form holds still but the colour still moves', () => {
    const mood = restingMood();
    const start = restingPulse();
    const still = advance(start, mood, [0.2, 0.9, 0.4], 0.5, true);
    expect(still.orbit).toBe(start.orbit);
    expect(still.phases).toEqual(start.phases);
    // Colour is the content for a Deaf viewer, so it must not freeze too.
    expect(still.drive).toBeGreaterThan(start.drive);
});

test('the spectrum reaches the shape', () => {
    const mood = restingMood();
    const quiet = advance(restingPulse(), mood, [0, 0, 0, 0], 0.1, false);
    const loud = advance(restingPulse(), mood, [1, 1, 1, 1], 0.1, false);
    expect(loud.drive).toBeGreaterThan(quiet.drive);
});

test('tuning constants stay in a sane range', () => {
    expect(MaxDeform).toBeGreaterThan(0.1);
    expect(MaxDeform).toBeLessThan(0.5);
    expect(BloomFallSeconds).toBeGreaterThan(0.5);
});
