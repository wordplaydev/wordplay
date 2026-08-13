import {
    CaptionSizeIcons,
    CaptionSizes,
    CaptionSizeSetting,
} from '@db/settings/CaptionSizeSetting';
import DefaultLocale from '@locale/DefaultLocale';
import { describe, expect, test } from 'vitest';

describe('the chooser agrees with itself', () => {
    test('sizes, icons, and locale tuples are all the same length', () => {
        // The settings row picks by index across all four, so a mismatch shows
        // as a button that selects the wrong size or renders a bare "?".
        const mode = DefaultLocale.ui.dialog.settings.mode.captionSize;
        expect(CaptionSizeIcons).toHaveLength(CaptionSizes.length);
        expect(mode.labels).toHaveLength(CaptionSizes.length);
        expect(mode.tips).toHaveLength(CaptionSizes.length);
    });

    test('every offered size survives validation unchanged', () => {
        // The real guard: adding a size outside the clamp would leave a button
        // in the dialog that silently selects a different button.
        for (const size of CaptionSizes)
            expect(CaptionSizeSetting.validator(size)).toBe(size);
    });

    test('the sizes ascend and bracket the default', () => {
        expect([...CaptionSizes].sort((a, b) => a - b)).toEqual(CaptionSizes);
        expect(CaptionSizes).toContain(CaptionSizeSetting.defaultValue);
        expect(CaptionSizes[0]).toBeLessThan(CaptionSizeSetting.defaultValue);
    });
});

describe('validation', () => {
    test('nonsense falls back to the default', () => {
        for (const value of [undefined, null, '2x', {}, Number.NaN, 0, -1])
            expect(CaptionSizeSetting.validator(value)).toBe(1);
    });

    test('a size outside the range is clamped, not rejected', () => {
        // Forgiveness rather than a snap back to default, so a value written by
        // a future release with more steps degrades to the nearest one we have.
        expect(CaptionSizeSetting.validator(0.1)).toBe(0.75);
        expect(CaptionSizeSetting.validator(10)).toBe(3);
        expect(CaptionSizeSetting.validator(Number.POSITIVE_INFINITY)).toBe(1);
    });
});
