import Drawing from '@components/output/Drawing.svelte.ts';
import { MinSampleDistance } from '@components/output/drawing';
import { expect, test } from 'vitest';

/**
 * A press on the stage while drawing is ambiguous until the pointer moves: a drag sweeps a
 * whole stroke out, a click places one point of a path built up over several. Both are asked
 * for in #167, and telling them apart is the only part of this state that isn't plumbing.
 */

function armed() {
    const drawing = new Drawing();
    drawing.setArmed(true);
    return drawing;
}

test('a press alone draws nothing', () => {
    const drawing = armed();
    drawing.press({ x: 1, y: 1 });
    expect(drawing.points).toEqual([]);
    expect(drawing.dragging).toBe(false);
});

test('a drag sweeps a stroke from where the press landed', () => {
    const drawing = armed();
    drawing.press({ x: 0, y: 0 });
    drawing.beginDrag();
    expect(drawing.dragging).toBe(true);
    // The press point is the stroke's first point, not a point that gets skipped.
    expect(drawing.points).toEqual([{ x: 0, y: 0 }]);

    expect(drawing.extend({ x: MinSampleDistance / 2, y: 0 })).toBe(false);
    expect(drawing.extend({ x: 1, y: 0 })).toBe(true);
    expect(drawing.points).toHaveLength(2);
});

test('clicks build one stroke rather than restarting it', () => {
    // Each press replaces `pressed`, and each release adds it — so three clicks are three
    // points of one path, not three paths of one point.
    const drawing = armed();
    for (const point of [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 0 },
    ]) {
        drawing.press(point);
        drawing.add(point);
        drawing.clearPress();
    }
    expect(drawing.points).toHaveLength(3);
    expect(drawing.open).toBe(true);
    expect(drawing.finish()).toHaveLength(3);
});

test('a stroke that is really a dot commits nothing but still ends', () => {
    const drawing = armed();
    drawing.press({ x: 3, y: 3 });
    drawing.add({ x: 3, y: 3 });
    expect(drawing.finish()).toBeUndefined();
    expect(drawing.points).toEqual([]);
    expect(drawing.open).toBe(false);
});

test('disarming abandons the stroke in progress', () => {
    // Otherwise a preview stays on stage with no gesture able to finish it.
    const drawing = armed();
    drawing.press({ x: 0, y: 0 });
    drawing.beginDrag();
    drawing.extend({ x: 2, y: 2 });
    expect(drawing.points.length).toBeGreaterThan(1);

    drawing.setArmed(false);
    expect(drawing.armed).toBe(false);
    expect(drawing.points).toEqual([]);
    expect(drawing.pressed).toBeUndefined();
    expect(drawing.dragging).toBe(false);
});

test('the keyboard cursor walks and stays where it is left', () => {
    // Placing several points in a row is a walk, not a series of returns to the origin.
    const drawing = armed();
    drawing.moveCursor(0.5, 0);
    drawing.add({ ...drawing.cursor });
    drawing.moveCursor(0, 0.5);
    drawing.add({ ...drawing.cursor });
    expect(drawing.points).toEqual([
        { x: 0.5, y: 0 },
        { x: 0.5, y: 0.5 },
    ]);
});

test('finishing a stroke also ends the mode', () => {
    // One press of the pencil, one path. While armed, a press meant to select an existing path
    // draws a new one instead, so bounding the mode to a single path is what stops that
    // happening over and over.
    const drawing = armed();
    drawing.press({ x: 0, y: 0 });
    drawing.beginDrag();
    drawing.extend({ x: 2, y: 2 });
    expect(drawing.finish()).toBeDefined();
    expect(drawing.armed).toBe(false);
});

test('a stroke that committed nothing still ends the mode', () => {
    // A press that never travelled is a finished gesture too, and Escape with nothing drawn is
    // the ordinary way to leave a mode.
    const drawing = armed();
    drawing.press({ x: 1, y: 1 });
    drawing.add({ x: 1, y: 1 });
    expect(drawing.finish()).toBeUndefined();
    expect(drawing.armed).toBe(false);
});

test('placing a point keeps the mode on', () => {
    // A click adds to the stroke rather than ending it, so a path can be built up over several
    // presses and ended deliberately.
    const drawing = armed();
    drawing.press({ x: 0, y: 0 });
    drawing.add({ x: 0, y: 0 });
    drawing.clearPress();
    expect(drawing.armed).toBe(true);
    expect(drawing.open).toBe(true);
});
