import { describe, expect, test } from 'vitest';
import exceedsMoveThreshold, {
    MouseMoveThreshold,
    TouchMoveThreshold,
} from '@components/output/moveThreshold';

describe('exceedsMoveThreshold', () => {
    test('a one-pixel wobble is not a move', () => {
        // The bug this exists to stop: a metre is 64px and the committed place is
        // rounded to two decimals, so one pixel becomes a real 0.02m edit.
        expect(exceedsMoveThreshold(1, 0, 'mouse')).toBe(false);
        expect(exceedsMoveThreshold(0, 1, 'mouse')).toBe(false);
        expect(exceedsMoveThreshold(1, 1, 'mouse')).toBe(false);
    });

    test('a deliberate drag is a move, on either axis or diagonally', () => {
        expect(exceedsMoveThreshold(20, 0, 'mouse')).toBe(true);
        expect(exceedsMoveThreshold(0, -20, 'mouse')).toBe(true);
        expect(exceedsMoveThreshold(-15, 15, 'mouse')).toBe(true);
    });

    test('distance is radial, not per-axis', () => {
        // 3-4-5: neither leg reaches the threshold on its own, but the travel does.
        expect(MouseMoveThreshold).toBeLessThanOrEqual(5);
        expect(exceedsMoveThreshold(3, 4, 'mouse')).toBe(true);
    });

    test('the boundary is inclusive', () => {
        expect(exceedsMoveThreshold(MouseMoveThreshold, 0, 'mouse')).toBe(true);
        expect(
            exceedsMoveThreshold(MouseMoveThreshold - 0.01, 0, 'mouse'),
        ).toBe(false);
    });

    test('touch and pen need more room than a mouse', () => {
        // A finger rolls a few pixels on even a deliberate tap, so the same travel
        // that is a drag for a mouse is still a tap for touch.
        expect(TouchMoveThreshold).toBeGreaterThan(MouseMoveThreshold);
        const between = (MouseMoveThreshold + TouchMoveThreshold) / 2;
        expect(exceedsMoveThreshold(between, 0, 'mouse')).toBe(true);
        expect(exceedsMoveThreshold(between, 0, 'touch')).toBe(false);
        expect(exceedsMoveThreshold(between, 0, 'pen')).toBe(false);
    });

    test('an unknown pointer type gets the cautious threshold', () => {
        // Some browsers report '' for synthesized events; treat those like touch
        // rather than letting them through at the smaller mouse threshold.
        expect(exceedsMoveThreshold(MouseMoveThreshold, 0, '')).toBe(false);
    });
});
