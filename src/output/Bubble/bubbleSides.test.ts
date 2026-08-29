import { expect, test } from 'vitest';
import {
    bubbleRect,
    overlapArea,
    resolveSides,
    SideMargin,
    type BubbleCandidate,
    type Rect,
} from '@output/Bubble/bubbleSides';

/** A box from its bottom-left corner, the frame a place is written in. */
function box(x: number, y: number, width = 1, height = 1): Rect {
    return { left: x, right: x + width, bottom: y, top: y + height };
}

/** A speaker at the origin with a 4×2 bubble and a 0.3 tail. */
function candidate(
    anchor = box(0, 0),
    pinned: BubbleCandidate['pinned'] = undefined,
): BubbleCandidate {
    return { anchor, width: 4, height: 2, tail: 0.3, pinned };
}

test('two rectangles that miss each other overlap by nothing', () => {
    expect(overlapArea(box(0, 0), box(5, 5))).toBe(0);
    // Touching edges are not an overlap.
    expect(overlapArea(box(0, 0), box(1, 0))).toBe(0);
});

test('overlap is the shared area', () => {
    expect(overlapArea(box(0, 0, 2, 2), box(1, 1, 2, 2))).toBe(1);
});

test('a bubble hangs off the side it is given, across the tail gap', () => {
    const up = bubbleRect(candidate(), '↑');
    expect(up.bottom).toBeCloseTo(1.3, 5);
    expect(up.top).toBeCloseTo(3.3, 5);
    // Centred on the speaker, which is 1 wide at x 0.
    expect(up.left).toBeCloseTo(-1.5, 5);

    const down = bubbleRect(candidate(), '↓');
    expect(down.top).toBeCloseTo(-0.3, 5);
    expect(down.bottom).toBeCloseTo(-2.3, 5);

    const left = bubbleRect(candidate(), '←');
    expect(left.right).toBeCloseTo(-0.3, 5);
    expect(left.left).toBeCloseTo(-4.3, 5);

    const right = bubbleRect(candidate(), '→');
    expect(right.left).toBeCloseTo(1.3, 5);
    expect(right.right).toBeCloseTo(5.3, 5);
});

test('with nothing in the way a bubble goes up', () => {
    expect(resolveSides([candidate()], [], undefined)).toEqual(['↑']);
});

test('a bubble avoids the side something is sitting on', () => {
    // A wall directly above the speaker, and nowhere else.
    const above = box(-3, 1, 6, 4);
    expect(resolveSides([candidate()], [above], undefined)).not.toEqual(['↑']);
});

test('a pinned side is used as given', () => {
    const above = box(-3, 1, 6, 4);
    expect(
        resolveSides([candidate(box(0, 0), '↑')], [above], undefined),
    ).toEqual(['↑']);
});

test('the second bubble avoids the first', () => {
    // Two speakers close enough that both bubbles cannot go up.
    const a = candidate(box(0, 0));
    const b = candidate(box(1, 0));
    const [first, second] = resolveSides([a, b], [], undefined);
    expect(first).toBe('↑');
    expect(second).not.toBe('↑');
});

test('a pinned bubble is still an obstacle for the ones after it', () => {
    const a = candidate(box(0, 0), '↑');
    const b = candidate(box(1, 0));
    const [, second] = resolveSides([a, b], [], undefined);
    expect(second).not.toBe('↑');
});

test('a bubble prefers to stay inside the content the stage already frames', () => {
    // Nothing is in the way on any side, so the frame is the only thing to go on:
    // a wide, shallow stage that a bubble above would leave entirely, and one to
    // the right would stay within.
    const content = box(-1, -0.5, 14, 2);
    expect(resolveSides([candidate()], [], content)).toEqual(['→']);
});

test('staying in frame never outweighs covering something', () => {
    // The Dialog regression: two letters in a tight row, where every side leaves
    // the row's bounds. Going up is outside the frame but in nobody's way; going
    // right lands on the other letter. The camera can grow; a covered letter is
    // just covered.
    const content = box(-1, -1, 8, 2);
    const neighbour = box(3, 0, 2, 3);
    expect(resolveSides([candidate()], [neighbour], content)).toEqual(['↑']);
});

test('a side barely better than the preferred one does not win', () => {
    // An obstacle overlapping "up" by less than the margin's worth of the
    // bubble's area. Without the margin this would flip; a drifting speaker
    // doing that repeatedly widens the frame in both directions forever.
    const bubbleArea = 4 * 2;
    const sliver = bubbleArea * (SideMargin / 2);
    const above = box(-1.5, 1.3, sliver, 1);
    expect(resolveSides([candidate()], [above], undefined)).toEqual(['↑']);
});

test('the same scene shifted a hair gives the same answer', () => {
    const above = box(-3, 1, 6, 4);
    const first = resolveSides([candidate(box(0, 0))], [above], undefined);
    const nudged = resolveSides([candidate(box(0.001, 0))], [above], undefined);
    expect(nudged).toEqual(first);
});
