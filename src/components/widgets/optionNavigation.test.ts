import { describe, expect, test } from 'vitest';
import {
    getFocusableOption,
    getNextOption,
    isNavigationKey,
} from './optionNavigation';

const all = [0, 1, 2, 3];

describe('getNextOption', () => {
    test('inline arrows move forward and back in reading order', () => {
        expect(getNextOption(all, 1, 'ArrowRight', false)).toBe(2);
        expect(getNextOption(all, 1, 'ArrowLeft', false)).toBe(0);
    });

    test('inline arrows swap under RTL, block arrows never do', () => {
        expect(getNextOption(all, 1, 'ArrowRight', true)).toBe(0);
        expect(getNextOption(all, 1, 'ArrowLeft', true)).toBe(2);
        expect(getNextOption(all, 1, 'ArrowDown', true)).toBe(2);
        expect(getNextOption(all, 1, 'ArrowUp', true)).toBe(0);
    });

    test('movement wraps at both ends', () => {
        expect(getNextOption(all, 3, 'ArrowRight', false)).toBe(0);
        expect(getNextOption(all, 0, 'ArrowLeft', false)).toBe(3);
    });

    test('Home and End jump to the ends regardless of direction', () => {
        expect(getNextOption(all, 2, 'Home', false)).toBe(0);
        expect(getNextOption(all, 2, 'End', false)).toBe(3);
        expect(getNextOption(all, 2, 'Home', true)).toBe(0);
    });

    test('omitted options are skipped, including when wrapping', () => {
        // Index 1 and 2 are omitted, so the group renders 0 and 3.
        const visible = [0, 3];
        expect(getNextOption(visible, 0, 'ArrowRight', false)).toBe(3);
        expect(getNextOption(visible, 3, 'ArrowRight', false)).toBe(0);
        expect(getNextOption(visible, 3, 'End', false)).toBe(3);
    });

    test('a hidden or absent selection starts from the near end', () => {
        // 2 is not rendered, so there is no neighbor to move from.
        expect(getNextOption([0, 1, 3], 2, 'ArrowRight', false)).toBe(0);
        expect(getNextOption([0, 1, 3], 2, 'ArrowLeft', false)).toBe(3);
    });

    test('unhandled keys and empty groups yield nothing', () => {
        expect(getNextOption(all, 1, 'Enter', false)).toBeUndefined();
        expect(getNextOption(all, 1, 'a', false)).toBeUndefined();
        expect(getNextOption([], 0, 'ArrowRight', false)).toBeUndefined();
    });
});

describe('isNavigationKey', () => {
    test('covers exactly the keys getNextOption handles', () => {
        for (const key of [
            'ArrowRight',
            'ArrowLeft',
            'ArrowDown',
            'ArrowUp',
            'Home',
            'End',
        ])
            expect(isNavigationKey(key)).toBe(true);
        for (const key of ['Enter', ' ', 'Tab', 'Escape'])
            expect(isNavigationKey(key)).toBe(false);
    });
});

describe('getFocusableOption', () => {
    test('the selected option holds the tab stop', () => {
        expect(getFocusableOption(all, 2)).toBe(2);
    });

    test('falls back to the first visible option', () => {
        expect(getFocusableOption(all, undefined)).toBe(0);
        // 0 is omitted, so the tab stop moves to the first rendered option.
        expect(getFocusableOption([1, 2, 3], undefined)).toBe(1);
        // A selection that isn't rendered can't hold the tab stop.
        expect(getFocusableOption([1, 2, 3], 0)).toBe(1);
    });

    test('an empty group has no tab stop', () => {
        expect(getFocusableOption([], 0)).toBeUndefined();
    });
});
