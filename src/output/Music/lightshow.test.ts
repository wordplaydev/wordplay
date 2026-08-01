import { expect, test } from 'vitest';
import type { InstrumentActivity } from '@output/Music/activity';
import {
    blastFor,
    fall,
    FallSeconds,
    FlashLuminanceDelta,
    Lightness,
    luminanceSwing,
    Opacity,
    RiseSeconds,
    spectrumBands,
    strike,
    tintToCSS,
} from '@output/Music/lightshow';

function sounding(instrument: string, level: number): InstrumentActivity {
    return { instrument, level, degree: 1, pan: 0, track: 0, strike: 1 };
}

test('silence produces no blast', () => {
    expect(blastFor([])).toBeUndefined();
});

test('the blast takes the colour of what just played', () => {
    // Piano's hue is 260.
    expect(blastFor([sounding('piano', 1)])?.hue).toBeCloseTo(260, 5);
});

test('an ensemble reads as one colour rather than flickering', () => {
    const both = blastFor([sounding('piano', 1), sounding('flute', 1)]);
    expect(both?.hue).toBeCloseTo(220, 0);
});

test('lightness and opacity never move, so the wash cannot flash', () => {
    // This is the safety property, and it replaces an earlier design that
    // blasted bright and fell dark on every note: at a fast tempo that
    // strobed. A flash is a change in *luminance*; holding lightness and
    // opacity fixed means there isn't one, however often notes arrive.
    const dark = tintToCSS({ hue: 0, energy: 0 });
    const lit = tintToCSS({ hue: 0, energy: 1 });
    expect(dark).toContain(`lch(${Lightness}%`);
    expect(lit).toContain(`lch(${Lightness}%`);
    expect(dark).toContain(`/ ${Opacity}`);
    expect(lit).toContain(`/ ${Opacity}`);
});

test('the luminance it does move stays under the flash threshold', () => {
    // Chroma changing at fixed lightness still nudges measured luminance a
    // little; that residue has to stay under what PhotosensitivityAnalysis
    // counts as a significant flash.
    expect(luminanceSwing()).toBeLessThan(FlashLuminanceDelta);
});

test('what a note changes is colour: chroma swells with energy', () => {
    const quiet = tintToCSS({ hue: 200, energy: 0 });
    const loud = tintToCSS({ hue: 200, energy: 1 });
    const chromaOf = (css: string) => Number(/lch\([\d.]+% (\d+)/.exec(css)?.[1]);
    expect(chromaOf(loud)).toBeGreaterThan(chromaOf(quiet) * 3);
});

test('the rise is quick but not a step, and the fall is slow', () => {
    // A step change in anything reads as a flash; 90ms still lands on the
    // beat. The fall is long enough to feel like a decay.
    expect(RiseSeconds).toBeGreaterThan(0.05);
    expect(RiseSeconds).toBeLessThan(0.2);
    expect(FallSeconds).toBeGreaterThan(RiseSeconds * 4);

    let tint = { hue: 0, energy: 0 };
    tint = strike(tint, { hue: 100, energy: 1 }, RiseSeconds / 3);
    // A third of the way through the rise, it is on its way but not there.
    expect(tint.energy).toBeGreaterThan(0.2);
    expect(tint.energy).toBeLessThan(0.5);
});

test('hue eases the short way around the wheel', () => {
    const tint = strike(
        { hue: 350, energy: 0.5 },
        { hue: 10, energy: 0.5 },
        RiseSeconds,
    );
    expect(tint.hue).toBeCloseTo(10, 5);
});

test('energy falls back to rest and never below', () => {
    expect(fall({ hue: 0, energy: 1 }, FallSeconds).energy).toBeCloseTo(0, 5);
    expect(fall({ hue: 0, energy: 0.1 }, 100).energy).toBe(0);
});

test('spectrum bands group logarithmically so bass is visible', () => {
    // A linear split would give almost every band to the treble, where music
    // has little energy, and the display would sit dead.
    const spectrum = new Uint8Array(128);
    for (let bin = 0; bin < 8; bin++) spectrum[bin] = 255;
    const bands = spectrumBands(spectrum, 8);
    expect(bands).toHaveLength(8);
    expect(bands[0]).toBeGreaterThan(0.5);
    expect(bands[bands.length - 1]).toBe(0);
});

test('an empty spectrum produces no bands', () => {
    expect(spectrumBands(new Uint8Array(0), 8)).toEqual([]);
});
