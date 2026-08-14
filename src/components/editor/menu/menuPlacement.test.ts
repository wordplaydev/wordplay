import { describe, expect, test } from 'vitest';
import { menuMaxHeight, placeMenu, submenuFlips } from './menuPlacement';

const container = { width: 400, height: 600 };

describe('placeMenu', () => {
    test('leaves a menu that already fits where it is', () => {
        expect(
            placeMenu(
                { left: 50, top: 60 },
                { width: 200, height: 150 },
                container,
            ),
        ).toEqual({
            left: 50,
            top: 60,
        });
    });

    test('pulls a menu anchored near the bottom back inside the container', () => {
        // The regression: the project box is much shorter than the viewport on a
        // phone, so clamping against the window left this at top: 560 and the
        // menu was clipped away by the project's `overflow: hidden`.
        expect(
            placeMenu(
                { left: 10, top: 560 },
                { width: 200, height: 150 },
                container,
            ).top,
        ).toBe(450);
    });

    test('pulls a menu anchored near the inline end back inside the container', () => {
        expect(
            placeMenu(
                { left: 380, top: 10 },
                { width: 200, height: 150 },
                container,
            ).left,
        ).toBe(200);
    });

    test('never places a menu bigger than its container off the top or start', () => {
        expect(
            placeMenu(
                { left: 100, top: 100 },
                { width: 900, height: 900 },
                container,
            ),
        ).toEqual({ left: 0, top: 0 });
    });

    test('is unchanged when the container is the whole viewport (desktop)', () => {
        const viewport = { width: 1600, height: 900 };
        expect(
            placeMenu(
                { left: 400, top: 300 },
                { width: 300, height: 200 },
                viewport,
            ),
        ).toEqual({ left: 400, top: 300 });
    });
});

describe('submenuFlips', () => {
    test('does not flip when there is room to the inline end', () => {
        expect(submenuFlips(10, 150, container)).toBe(false);
    });

    test('flips when a second menu width would spill out', () => {
        expect(submenuFlips(180, 150, container)).toBe(true);
    });
});

describe('menuMaxHeight', () => {
    test('never exceeds the container', () => {
        expect(menuMaxHeight(container)).toBe(600);
    });
});
