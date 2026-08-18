import { describe, expect, test } from 'vitest';
import scrollKeyAction, {
    nextScrollTarget,
    pageStep,
    scrollBehaviorFor,
} from './scrollKeys';

describe('nextScrollTarget', () => {
    const max = 3578;

    test('adds the delta to where the scroller is already heading', () => {
        expect(nextScrollTarget(0, { kind: 'by', delta: 717 }, max)).toBe(717);
        expect(nextScrollTarget(717, { kind: 'by', delta: 717 }, max)).toBe(
            1434,
        );
    });

    test('accumulates across a held key instead of stalling', () => {
        // The regression: thirty repeats used to travel 147px and settle at 881.
        let target = 0;
        for (let i = 0; i < 30; i++)
            target = nextScrollTarget(target, { kind: 'by', delta: 717 }, max);
        expect(target).toBe(max);
    });

    test('clamps at both ends so a long hold has somewhere to land', () => {
        expect(nextScrollTarget(3500, { kind: 'by', delta: 717 }, max)).toBe(
            max,
        );
        expect(nextScrollTarget(100, { kind: 'by', delta: -717 }, max)).toBe(0);
    });

    test('jumps to the ends, whatever the pending target was', () => {
        expect(
            nextScrollTarget(2000, { kind: 'to', where: 'start' }, max),
        ).toBe(0);
        expect(nextScrollTarget(2000, { kind: 'to', where: 'end' }, max)).toBe(
            max,
        );
    });
});

describe('scrollBehaviorFor', () => {
    test('scrolls smoothly when motion is on', () => {
        expect(scrollBehaviorFor(1)).toBe('smooth');
        expect(scrollBehaviorFor(0.5)).toBe('smooth');
    });

    test('jumps when the creator or their OS asked for calm', () => {
        expect(scrollBehaviorFor(0)).toBe('auto');
    });
});

describe('pageStep', () => {
    // Chromium and WebKit both use max(0.875 * height, height - 40).
    test('matches the engines: a viewport less two lines, on a tall viewport', () => {
        expect(pageStep(800)).toBe(760);
        expect(pageStep(1000)).toBe(960);
    });

    test('matches the engines: seven eighths, on a short viewport', () => {
        // Below 320px the fraction wins over the fixed overlap.
        expect(pageStep(200)).toBe(175);
        expect(pageStep(320)).toBe(280);
    });
});

describe('scrollKeyAction', () => {
    test('pages down and up by the native page step', () => {
        expect(scrollKeyAction('PageDown', false, 800)).toEqual({
            kind: 'by',
            delta: 760,
        });
        expect(scrollKeyAction('PageUp', false, 800)).toEqual({
            kind: 'by',
            delta: -760,
        });
    });

    test('space pages down, and up with shift', () => {
        expect(scrollKeyAction(' ', false, 800)).toEqual({
            kind: 'by',
            delta: 760,
        });
        expect(scrollKeyAction(' ', true, 800)).toEqual({
            kind: 'by',
            delta: -760,
        });
    });

    test('arrows step a line', () => {
        expect(scrollKeyAction('ArrowDown', false, 800)).toEqual({
            kind: 'by',
            delta: 40,
        });
        expect(scrollKeyAction('ArrowUp', false, 800)).toEqual({
            kind: 'by',
            delta: -40,
        });
    });

    test('home and end jump to the ends', () => {
        expect(scrollKeyAction('Home', false, 800)).toEqual({
            kind: 'to',
            where: 'start',
        });
        expect(scrollKeyAction('End', false, 800)).toEqual({
            kind: 'to',
            where: 'end',
        });
    });

    test('leaves keys it does not own alone', () => {
        for (const key of ['a', 'Enter', 'Tab', 'Escape', 'ArrowLeft'])
            expect(scrollKeyAction(key, false, 800)).toBeUndefined();
    });
});
