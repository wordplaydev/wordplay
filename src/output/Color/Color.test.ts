import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';
import { toColor } from '@output/Color/Color';
import { Focals } from '@output/Color/BasicColors';

test('Color.random() returns one of the basic colors', () => {
    const color = toColor(evaluateCode('Color.random()'));
    expect(color).toBeDefined();
    const matches = Object.values(Focals).some(
        (focal) =>
            color?.lightness.toNumber() === focal.l &&
            color?.chroma.toNumber() === focal.c &&
            color?.hue.toNumber() === focal.h,
    );
    expect(matches).toBe(true);
});

test('Color.random(a) keeps lightness and chroma but randomizes hue', () => {
    const color = toColor(evaluateCode('Color.random(Color.blue)'));
    expect(color).toBeDefined();
    expect(color?.lightness.toNumber()).toBe(Focals.blue.l);
    expect(color?.chroma.toNumber()).toBe(Focals.blue.c);
    expect(color?.hue.toNumber()).toBeGreaterThanOrEqual(0);
    expect(color?.hue.toNumber()).toBeLessThan(360);
});

test('Color.random(a b) chooses each channel within the two colors range', () => {
    // black is l=0,c=0,h=0; white is l=1,c=0,h=0 — so lightness ranges 0–1
    // while chroma and hue are pinned to 0.
    const color = toColor(evaluateCode('Color.random(Color.black Color.white)'));
    expect(color).toBeDefined();
    expect(color?.lightness.toNumber()).toBeGreaterThanOrEqual(0);
    expect(color?.lightness.toNumber()).toBeLessThanOrEqual(1);
    expect(color?.chroma.toNumber()).toBe(0);
    expect(color?.hue.toNumber()).toBe(0);
});

test('Color.lighter() raises lightness by 5%, keeping chroma and hue', () => {
    const color = toColor(evaluateCode('Color.blue.lighter()'));
    expect(color).toBeDefined();
    expect(color?.lightness.toNumber()).toBeCloseTo(Focals.blue.l + 0.05, 10);
    expect(color?.chroma.toNumber()).toBe(Focals.blue.c);
    expect(color?.hue.toNumber()).toBe(Focals.blue.h);
});

test('Color.lighter(by) raises lightness by the given percent', () => {
    const color = toColor(evaluateCode('Color.blue.lighter(20%)'));
    expect(color?.lightness.toNumber()).toBeCloseTo(Focals.blue.l + 0.2, 10);
});

test('Color.darker() lowers lightness by 5%', () => {
    const color = toColor(evaluateCode('Color.blue.darker()'));
    expect(color?.lightness.toNumber()).toBeCloseTo(Focals.blue.l - 0.05, 10);
    expect(color?.chroma.toNumber()).toBe(Focals.blue.c);
    expect(color?.hue.toNumber()).toBe(Focals.blue.h);
});

test('Color.lighter()/darker() clamp lightness to [0,1]', () => {
    // white is already l=1, so lightening stays at 1; black is l=0, so
    // darkening stays at 0.
    expect(toColor(evaluateCode('Color.white.lighter()'))?.lightness.toNumber()).toBe(1);
    expect(toColor(evaluateCode('Color.black.darker()'))?.lightness.toNumber()).toBe(0);
});
