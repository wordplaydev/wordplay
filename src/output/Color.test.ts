import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';
import { toColor } from '@output/Color';
import { Focals } from '@output/BasicColors';

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
