import { serializeColor } from '@output/Color/ColorJS';
import {
    AdaptationLightnessThreshold,
    adaptColorCSS,
    adaptLightness,
    backgroundInvitesAdaptation,
} from '@output/Color/adapt';
import Color, { luminanceDelta } from '@output/Color/Color';
import { contrast } from '@util/colorContrast';
import NumberLiteral from '@nodes/NumberLiteral';
import NoneValue from '@values/NoneValue';
import Decimal from 'decimal.js';
import { describe, expect, test } from 'vitest';

/** Color carries a Value only for provenance, so any value will do here. */
const Provenance = new NoneValue(NumberLiteral.make(1));
function makeColor(l: number, c: number, h: number): Color {
    return new Color(
        Provenance,
        new Decimal(l),
        new Decimal(c),
        new Decimal(h),
    );
}

/** A deterministic grid, so the contrast sweep can never flake. */
const LIGHTNESSES = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
const CHROMAS = [0, 20, 40, 60, 80, 100, 120];
const HUES = [0, 45, 90, 135, 180, 225, 270, 315];

/** The hex a browser paints for this LCH, gamut-mapped the way CSS requires.
 *  Expanded to 6 digits, since `contrast` indexes fixed offsets. */
function hex(l: number, c: number, h: number): string {
    const text = serializeColor(l, c, h, 'hex').text;
    return text.length === 4
        ? `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`
        : text;
}

describe('adaptLightness', () => {
    test('preserves every pairwise lightness difference exactly', () => {
        for (const a of LIGHTNESSES)
            for (const b of LIGHTNESSES)
                expect(
                    Math.abs(adaptLightness(a) - adaptLightness(b)),
                ).toBeCloseTo(Math.abs(a - b), 12);
    });

    test('is an involution', () => {
        for (const l of LIGHTNESSES)
            expect(adaptLightness(adaptLightness(l))).toBeCloseTo(l, 12);
    });

    test('clamps a lightness outside 0–1 rather than going negative', () => {
        // Stage's implicit background historically carried 100, not 1.
        expect(adaptLightness(100)).toBe(0);
        expect(adaptLightness(-1)).toBe(1);
    });
});

describe('Color adaptation', () => {
    test('adapted() and toCSS(true) agree, so the two paths cannot drift', () => {
        for (const l of LIGHTNESSES)
            for (const c of CHROMAS)
                for (const h of HUES)
                    expect(makeColor(l, c, h).adapted(true).toCSS()).toBe(
                        makeColor(l, c, h).toCSS(true),
                    );
    });

    test('adapting twice returns the authored color', () => {
        for (const l of LIGHTNESSES)
            for (const c of CHROMAS)
                for (const h of HUES) {
                    const color = makeColor(l, c, h);
                    const round = color.adapted(true).adapted(true);
                    // Involution holds to floating-point precision: the
                    // lightness arithmetic is done in doubles so `toCSS` can
                    // stay allocation-free on the per-frame path.
                    expect(round.lightness.toNumber()).toBeCloseTo(l, 12);
                    expect(round.chroma.equals(color.chroma)).toBe(true);
                    expect(round.hue.equals(color.hue)).toBe(true);
                }
    });

    test('not adapting allocates nothing', () => {
        const color = makeColor(0.5, 40, 90);
        expect(color.adapted(false)).toBe(color);
    });

    test('leaves the photosensitivity analysis valid', () => {
        // PhotosensitivityAnalysis measures flashes as |ΔL| between colors.
        // Adaptation preserves that exactly, which is why the analysis can go
        // on running on authored values and needs no knowledge of this.
        for (const a of LIGHTNESSES)
            for (const b of LIGHTNESSES) {
                const first = makeColor(a, 40, 90);
                const second = makeColor(b, 40, 270);
                expect(
                    luminanceDelta(first.adapted(true), second.adapted(true)),
                ).toBeCloseTo(luminanceDelta(first, second), 12);
            }
    });

    test('hue and chroma survive adaptation', () => {
        const color = makeColor(0.8, 45, 260).adapted(true);
        expect(color.chroma.toNumber()).toBe(45);
        expect(color.hue.toNumber()).toBe(260);
    });
});

/**
 * The measurement the whole feature rests on. Adapting a stage moves every
 * color on it together, so what matters is whether a foreground still contrasts
 * with the background it sits on. Measured against what a browser actually
 * paints (gamut-mapped hex), not the unmapped LCH.
 */
describe('contrast survives adaptation', () => {
    /** Above the threshold the worst a passing pair falls to is 4.07, on an
     *  extreme-chroma color well outside sRGB. Anything below this floor is a
     *  real regression rather than the measured graze. */
    const AA_GRAZING_FLOOR = 4.0;
    const AA = 4.5;

    test('a foreground that passed AA on a light stage still does on the adapted one', () => {
        let lost = 0;
        let gained = 0;
        let pairs = 0;
        let worst = Infinity;
        // Only backgrounds bright enough to invite adaptation. Everything
        // dimmer is left as authored, which is the whole point of the
        // threshold — see AdaptationLightnessThreshold.
        for (const backgroundLightness of [0.85, 0.9, 0.95, 1])
            for (const l of LIGHTNESSES)
                for (const c of CHROMAS)
                    for (const h of HUES) {
                        const before = contrast(
                            hex(l, c, h),
                            hex(backgroundLightness, 0, 0),
                        );
                        const after = contrast(
                            hex(adaptLightness(l), c, h),
                            hex(adaptLightness(backgroundLightness), 0, 0),
                        );
                        pairs++;
                        if (before >= AA && after < AA) {
                            lost++;
                            worst = Math.min(worst, after);
                        }
                        if (before < AA && after >= AA) gained++;
                    }
        // Nothing falls meaningfully below the threshold…
        expect(worst === Infinity ? AA : worst).toBeGreaterThanOrEqual(
            AA_GRAZING_FLOOR,
        );
        // …only a sliver grazes it…
        expect(lost / pairs).toBeLessThan(0.005);
        // …and adaptation buys more contrast than it spends. Asserting the
        // gain direction too means a future "improvement" that trades gains
        // for losses can't pass quietly.
        expect(gained).toBeGreaterThan(lost);
    });

    test('the default black-on-white stage keeps all of its contrast', () => {
        expect(contrast(hex(0, 0, 0), hex(1, 0, 0))).toBeCloseTo(
            contrast(hex(1, 0, 0), hex(0, 0, 0)),
            10,
        );
    });
});

describe('backgroundInvitesAdaptation', () => {
    test('leaves an already-dark stage alone', () => {
        expect(backgroundInvitesAdaptation(0)).toBe(false);
        expect(backgroundInvitesAdaptation(0.3)).toBe(false);
    });

    test('leaves a mid-toned stage alone', () => {
        // It has more contrast to lose than glare to save, and it isn't the
        // blinding white rectangle the feature exists for.
        expect(backgroundInvitesAdaptation(0.5)).toBe(false);
        expect(backgroundInvitesAdaptation(0.75)).toBe(false);
        expect(backgroundInvitesAdaptation(AdaptationLightnessThreshold)).toBe(
            false,
        );
    });

    test('adapts a bright stage', () => {
        expect(backgroundInvitesAdaptation(0.85)).toBe(true);
        expect(backgroundInvitesAdaptation(1)).toBe(true);
    });
});

describe('adaptColorCSS', () => {
    test('inverts lightness and keeps the notation', () => {
        expect(adaptColorCSS('lch(90% 20 130deg)')).toBe('lch(10% 20 130deg)');
        expect(adaptColorCSS('lch(100% 0 0deg)')).toBe('lch(0% 0 0deg)');
        // Round-trips through the notation Color.toCSS emits.
        expect(adaptColorCSS(adaptColorCSS('lch(80% 40 200deg)'))).toBe(
            'lch(80% 40 200deg)',
        );
    });

    test('leaves a notation it cannot read untouched', () => {
        // Nothing persisted uses these, but silently mangling one would be
        // worse than leaving it.
        expect(adaptColorCSS('#ffffff')).toBe('#ffffff');
        expect(adaptColorCSS('rgb(1 2 3)')).toBe('rgb(1 2 3)');
    });

    test('leaves anything that is not a color untouched', () => {
        // Persisted previews store this when the project threw.
        expect(adaptColorCSS('var(--wordplay-error)')).toBe(
            'var(--wordplay-error)',
        );
        expect(adaptColorCSS('')).toBe('');
    });
});
