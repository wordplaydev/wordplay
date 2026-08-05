/**
 * How far a pointer must travel before a press on stage output becomes a move.
 *
 * Without this, the first `pointermove` after `pointerdown` commits a move — and
 * almost no real click is pixel-perfect. A metre is 64 screen pixels, and the
 * committed place is rounded to two decimals, so a single pixel of jitter becomes
 * a 0.02m change: a genuine source edit and an undo entry from what the creator
 * meant as a click.
 *
 * Touch and pen need more room than a mouse, since a finger rolls a few pixels on
 * even a deliberate tap.
 *
 * The editor uses a flat 10px for node dragging (`exceededDragThreshold` in
 * Editor.svelte). This is smaller for a mouse on purpose: that gesture chooses
 * between two interpretations of a drag, while this one only needs to tell a click
 * from a drag, and direct manipulation should start promptly.
 */
export const MouseMoveThreshold = 4;
export const TouchMoveThreshold = 10;

/** The threshold for a pointer type, in pixels. */
export function moveThresholdFor(pointerType: string): number {
    return pointerType === 'mouse' ? MouseMoveThreshold : TouchMoveThreshold;
}

/**
 * Whether a pointer that has travelled (dx, dy) pixels from where it went down
 * has moved far enough to count as a drag rather than a click.
 */
export default function exceedsMoveThreshold(
    dx: number,
    dy: number,
    pointerType: string,
): boolean {
    return Math.hypot(dx, dy) >= moveThresholdFor(pointerType);
}
