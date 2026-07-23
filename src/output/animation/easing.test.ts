import { expect, test } from 'vitest';
import { cubicBezier, Easings } from '@output/animation/easing';
import { styleToEasingFunction } from '@output/animation/OutputAnimation';
import DefaultLocales from '@locale/DefaultLocales';

test('cubicBezier anchors at its endpoints', () => {
    const ease = cubicBezier(0.42, 0, 0.58, 1); // ease-in-out
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    // Clamps out-of-range input.
    expect(ease(-1)).toBe(0);
    expect(ease(2)).toBe(1);
});

test('cubicBezier is monotonically increasing', () => {
    const ease = cubicBezier(0.42, 0, 0.58, 1);
    let last = -Infinity;
    for (let x = 0; x <= 1.0001; x += 0.05) {
        const y = ease(x);
        expect(y).toBeGreaterThanOrEqual(last);
        last = y;
    }
});

test('easing curves bend the expected direction at the midpoint', () => {
    // ease-out starts fast: above linear by the midpoint.
    expect(Easings['ease-out'](0.5)).toBeGreaterThan(0.5);
    // ease-in starts slow: below linear by the midpoint.
    expect(Easings['ease-in'](0.5)).toBeLessThan(0.5);
    // ease-in-out is symmetric about the midpoint.
    expect(Easings['ease-in-out'](0.5)).toBeCloseTo(0.5, 5);
    // linear is the identity.
    expect(Easings.linear(0.5)).toBe(0.5);
});

test('styleToEasingFunction matches the CSS easing keyword mapping', () => {
    // Mirrors styleToCSSEasing: straight→linear, pokey→ease-in,
    // cautious→ease-in-out, zippy→ease-out, default→ease-out.
    expect(styleToEasingFunction(DefaultLocales, 'straight')).toBe(
        Easings.linear,
    );
    expect(styleToEasingFunction(DefaultLocales, 'pokey')).toBe(
        Easings['ease-in'],
    );
    expect(styleToEasingFunction(DefaultLocales, 'cautious')).toBe(
        Easings['ease-in-out'],
    );
    expect(styleToEasingFunction(DefaultLocales, 'zippy')).toBe(
        Easings['ease-out'],
    );
    // Unknown / undefined falls back to ease-out.
    expect(styleToEasingFunction(DefaultLocales, undefined)).toBe(
        Easings['ease-out'],
    );
    expect(styleToEasingFunction(DefaultLocales, 'bogus')).toBe(
        Easings['ease-out'],
    );
});
