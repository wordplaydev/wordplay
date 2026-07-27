import { describe, expect, test } from 'vitest';
import { BCTKeys, describeColor, Focals } from '@output/Color/BasicColors';
import evaluateCode from '@runtime/evaluate';
import NumberValue from '@values/NumberValue';

describe('describeColor', () => {
    test('every focal point resolves to its own BCT with no modifier', () => {
        for (const key of BCTKeys) {
            const focal = Focals[key];
            const description = describeColor(focal.l, focal.c, focal.h);
            expect(description.bcts[0], `focal for ${key}`).toBe(key);
            expect(description.modifier, `focal for ${key}`).toBeUndefined();
        }
    });

    test('lightness above focal triggers light modifier', () => {
        const focal = Focals.blue;
        const d = describeColor(focal.l + 0.25, focal.c, focal.h);
        expect(d.modifier).toBe('light');
    });

    test('lightness below focal triggers dark modifier', () => {
        const focal = Focals.red;
        const d = describeColor(focal.l - 0.25, focal.c, focal.h);
        expect(d.modifier).toBe('dark');
    });

    test('low chroma + mid lightness reads as plain gray', () => {
        const d = describeColor(0.5, 2, 0);
        expect(d.bcts).toEqual(['gray']);
        expect(d.modifier).toBeUndefined();
    });

    test('low chroma + high lightness reads as light gray', () => {
        const d = describeColor(0.75, 2, 0);
        expect(d.bcts).toEqual(['gray']);
        expect(d.modifier).toBe('light');
    });

    test('low chroma + very low lightness reads as black with no modifier', () => {
        const d = describeColor(0.02, 2, 0);
        expect(d.bcts).toEqual(['black']);
        expect(d.modifier).toBeUndefined();
    });

    test('low chroma + very high lightness reads as white with no modifier', () => {
        const d = describeColor(0.98, 2, 0);
        expect(d.bcts).toEqual(['white']);
        expect(d.modifier).toBeUndefined();
    });

    test('hue between blue and purple yields a mix description', () => {
        // Blue is around hue 260, purple around 310. ~285 should sit
        // between them with comparable distances.
        const d = describeColor(0.45, 75, 285);
        expect(d.bcts.length).toBe(2);
        expect(d.bcts).toEqual(expect.arrayContaining(['blue', 'purple']));
    });

    test('hue wrap: 359° classifies near 0° focals (red/pink)', () => {
        const d = describeColor(Focals.red.l, Focals.red.c, 359);
        // Red's focal is hue 40 but at L=0.54, C=107 the closest BCT to
        // hue 359 should still be in the red/pink family, not e.g. green.
        expect(d.bcts[0]).toBeOneOf(['red', 'pink', 'purple']);
    });
});

describe('Color BCT static binds', () => {
    test('Color.red evaluates to a Color value whose LCH matches the red focal', () => {
        const value = evaluateCode('Color.red.hue');
        expect(value).toBeInstanceOf(NumberValue);
        expect((value as NumberValue).toNumber()).toBeCloseTo(Focals.red.h);
    });

    test('Color.blue.lightness matches the blue focal', () => {
        const value = evaluateCode('Color.blue.lightness');
        expect(value).toBeInstanceOf(NumberValue);
        // lightness is stored as 0–1 in the Color value
        expect((value as NumberValue).toNumber()).toBeCloseTo(Focals.blue.l);
    });

    test("Phrase('hi' color: Color.red) evaluates without exception", () => {
        // Regression: an earlier lazy-eval path tripped the evaluator's
        // "already stepping" guard, returning a structure value instead of
        // evaluating the Phrase to a StageView-ready output.
        const value = evaluateCode("Phrase('hi' color: Color.red)");
        expect(value).toBeDefined();
        expect(value?.constructor.name).not.toBe('NameException');
    });
});
