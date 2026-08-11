import { expect, test } from 'vitest';
import { toPreviewBox, toPreviewPoint } from './cameraPreview';

const Size = 200;

test('the center of the frame stays centered', () => {
    expect(toPreviewPoint({ x: 0.5, y: 0.5 }, Size, Size)).toEqual({
        x: 100,
        y: 100,
    });
});

test('x is mirrored and y is not', () => {
    // A landmark on the sensor's left draws on the preview's right, so the
    // creator sees a mirror; y keeps its direction, since the frame is not
    // flipped vertically.
    expect(toPreviewPoint({ x: 0.2, y: 0.25 }, Size, Size)).toEqual({
        x: 160,
        y: 50,
    });
    const right = toPreviewPoint({ x: 0.8, y: 0.75 }, Size, Size);
    expect(right.x).toBeCloseTo(40);
    expect(right.y).toBeCloseTo(150);
});

test('every point in the frame maps inside the preview', () => {
    // The regression this guards: the previous mapping scaled x by the full
    // sensor aspect rather than the square crop the model was given, pushing
    // points near the frame edges outside the panel.
    for (let i = 0; i <= 10; i++) {
        for (let j = 0; j <= 10; j++) {
            const { x, y } = toPreviewPoint({ x: i / 10, y: j / 10 }, 200, 120);
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(200);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThanOrEqual(120);
        }
    }
});

test('a mirrored box anchors on what was its right edge', () => {
    // Boxes are anchored top-left, so mirroring has to move the origin to the
    // opposite corner or the box drifts by its own width.
    const box = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };
    const mapped = toPreviewBox(box, Size, Size);
    expect(mapped.x).toBeCloseTo(120); // (1 - (0.1 + 0.3)) * 200
    expect(mapped.y).toBeCloseTo(40);
    expect(mapped.width).toBeCloseTo(60);
    expect(mapped.height).toBeCloseTo(80);
});

test('mirroring a box preserves its size and keeps it in frame', () => {
    const box = { x: 0.7, y: 0.1, width: 0.3, height: 0.2 };
    const mapped = toPreviewBox(box, Size, Size);
    expect(mapped.width).toBe(box.width * Size);
    expect(mapped.height).toBe(box.height * Size);
    // A box hugging the sensor's right edge lands against the preview's left.
    expect(mapped.x).toBeCloseTo(0);
    expect(mapped.x + mapped.width).toBeLessThanOrEqual(Size);
});
