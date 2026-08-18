import { expect, test } from 'vitest';
import {
    PX_PER_METER,
    rootScale,
    screenToStage,
    stageToScreen,
} from '@output/Output/outputToCSS';

const FOCUSES = [
    { x: 0, y: 0, z: -12 },
    // A non-zero focus y is the case that was broken: auto-fit centers on the content, so
    // the camera's y is non-zero the moment content sits anywhere but the vertical origin.
    { x: 0, y: 3, z: -12 },
    { x: -2, y: 5, z: -8 },
    { x: 4.5, y: -1.25, z: -1 },
    { x: -7, y: 2, z: -40 },
];

const PLACES = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -3.5, y: 2.25 },
    { x: 8, y: -6 },
];

test('screenToStage inverts stageToScreen on both axes', () => {
    for (const focus of FOCUSES)
        for (const place of PLACES) {
            const screen = stageToScreen(
                place.x,
                place.y,
                focus.x,
                focus.y,
                focus.z,
            );
            const back = screenToStage(
                screen.x,
                screen.y,
                focus.x,
                focus.y,
                focus.z,
            );
            expect(back.x).toBeCloseTo(place.x, 10);
            expect(back.y).toBeCloseTo(place.y, 10);
        }
});

test('the viewport centre maps to what the camera is looking at', () => {
    // The assertion that fails with the old `position.y -= focus.y`: with a camera panned
    // up, the centre of the screen is the camera's own y, not its negation.
    const focus = { x: -2, y: 3, z: -12 };
    const centre = screenToStage(0, 0, focus.x, focus.y, focus.z);
    expect(centre.x).toBeCloseTo(-focus.x, 10);
    expect(centre.y).toBeCloseTo(focus.y, 10);
});

test('a camera panned up reports pointer positions further up', () => {
    // Pins the sign directly: raising the camera raises the stage y under a fixed pixel.
    const low = screenToStage(0, -64, 0, 0, -8);
    const high = screenToStage(0, -64, 0, 2, -8);
    expect(high.y).toBeCloseTo(low.y + 2, 10);
});

test('screen y grows downward while stage y grows upward', () => {
    const up = screenToStage(0, -100, 0, 0, -8);
    const down = screenToStage(0, 100, 0, 0, -8);
    expect(up.y).toBeGreaterThan(0);
    expect(down.y).toBeLessThan(0);
});

test('zooming out covers more metres per pixel', () => {
    // rootScale is FOCAL_LENGTH / -z, so doubling the distance halves the scale and
    // doubles the metres a pixel spans.
    const near = screenToStage(64, 0, 0, 0, -8);
    const far = screenToStage(64, 0, 0, 0, -16);
    expect(far.x).toBeCloseTo(near.x * 2, 10);
});

test('the mapping agrees with the scale the renderer uses', () => {
    // Guards against drift in PX_PER_METER/FOCAL_LENGTH or in rootScale itself.
    const z = -12;
    const scale = rootScale(0, z);
    expect(stageToScreen(1, 0, 0, 0, z).x).toBeCloseTo(
        PX_PER_METER * scale,
        10,
    );
    expect(stageToScreen(0, 1, 0, 0, z).y).toBeCloseTo(
        -PX_PER_METER * scale,
        10,
    );
});

test('a degenerate camera reports the focus rather than an infinity', () => {
    // rootScale returns 0 behind the focus, which would otherwise divide to Infinity and
    // hand the program a nonsense Place.
    const behind = screenToStage(50, 50, 1, 2, 0);
    expect(Number.isFinite(behind.x)).toBe(true);
    expect(Number.isFinite(behind.y)).toBe(true);
});
