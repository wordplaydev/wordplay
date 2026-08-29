/**
 * Choosing which side of a phrase its speech bubble sits on.
 *
 * Pure over plain rectangles — no `Output`, no `RenderContext`, no DOM — because
 * the scoring rule is the part of this feature most likely to be tuned, and it
 * should be arguable against four hand-written boxes rather than a rendered
 * stage. `bubbleLayout.ts` is the half that needs a canvas.
 *
 * Everything here is in metres in the container's own frame, y up, the same
 * frame a child's `place` is written in.
 */

import type { BubbleSide } from '@output/Bubble/Bubble';

/** A box in the container's frame. Structurally the same as `fit.ts`'s Box,
 *  declared here so the model layer needn't import from the view layer. */
export type Rect = {
    left: number;
    right: number;
    top: number;
    bottom: number;
};

/** A bubble waiting for a side: what it hangs off, how big it is, and its tail gap. */
export type BubbleCandidate = {
    /** The speaker's own box. */
    anchor: Rect;
    width: number;
    height: number;
    /** The gap between the speaker's edge and the bubble, which the tail spans. */
    tail: number;
    /** The side the creator pinned, or undefined to choose one. */
    pinned: BubbleSide | undefined;
};

/**
 * Which side to try first, and the order to fall back through. Up is first
 * because it is where a reader looks for speech; down is last because it is
 * where a stage usually has other output.
 */
export const SidePreference: readonly BubbleSide[] = ['↑', '→', '←', '↓'];

/**
 * How much better another side has to score before the bubble leaves the one it
 * prefers, as a fraction of the bubble's own area.
 *
 * This is not hysteresis — nothing is remembered between frames, so the answer
 * stays a pure function of the scene. It exists because the framing envelope
 * never tightens: a speaker that drifts across the stage and flips between two
 * sides grows the frame in *both* directions, permanently, and a bubble that
 * changes sides for a hundredth of an overlap is not worth that.
 */
export const SideMargin = 0.08;

/** What a bubble covering other output costs, per unit area. */
const OutputWeight = 1;
/** What a bubble covering another bubble costs. Words over words are worse than
 *  words over a shape, since neither is then readable. */
const BubbleWeight = 1.5;
/**
 * What falling outside the container's content costs.
 *
 * Much lower than an overlap, and deliberately so: the camera grows to include a
 * bubble wherever it goes, so leaving the current bounds costs a little zoom,
 * while covering another output costs the reader the thing it covers. Weighted
 * any higher and a bubble above two letters — outside a tight row's bounds, but
 * in nobody's way — loses to one sitting straight on top of its neighbour.
 */
const OutsideWeight = 0.15;

/** The area two rectangles share, or 0 if they don't meet. */
export function overlapArea(a: Rect, b: Rect): number {
    const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const height = Math.min(a.top, b.top) - Math.max(a.bottom, b.bottom);
    return width > 0 && height > 0 ? width * height : 0;
}

/** Where a bubble sits for a given side, in the container's frame. */
export function bubbleRect(candidate: BubbleCandidate, side: BubbleSide): Rect {
    const { anchor, width, height, tail } = candidate;
    const centerX = (anchor.left + anchor.right) / 2;
    const centerY = (anchor.top + anchor.bottom) / 2;
    switch (side) {
        case '↑': {
            const bottom = anchor.top + tail;
            return {
                left: centerX - width / 2,
                right: centerX + width / 2,
                bottom,
                top: bottom + height,
            };
        }
        case '↓': {
            const top = anchor.bottom - tail;
            return {
                left: centerX - width / 2,
                right: centerX + width / 2,
                top,
                bottom: top - height,
            };
        }
        case '←': {
            const right = anchor.left - tail;
            return {
                right,
                left: right - width,
                top: centerY + height / 2,
                bottom: centerY - height / 2,
            };
        }
        case '→': {
            const left = anchor.right + tail;
            return {
                left,
                right: left + width,
                top: centerY + height / 2,
                bottom: centerY - height / 2,
            };
        }
    }
}

/** How much of a rectangle falls outside another. */
function areaOutside(rect: Rect, bounds: Rect): number {
    const area =
        Math.max(0, rect.right - rect.left) *
        Math.max(0, rect.top - rect.bottom);
    return area - overlapArea(rect, bounds);
}

/**
 * What a placement costs, as a fraction of the bubble's own area — normalized so
 * one margin means the same thing whatever size the bubble is.
 */
function score(
    rect: Rect,
    obstacles: readonly Rect[],
    placed: readonly Rect[],
    content: Rect | undefined,
): number {
    const area =
        Math.max(0, rect.right - rect.left) *
        Math.max(0, rect.top - rect.bottom);
    if (area <= 0) return 0;
    let cost = 0;
    for (const obstacle of obstacles)
        cost += OutputWeight * overlapArea(rect, obstacle);
    for (const other of placed) cost += BubbleWeight * overlapArea(rect, other);
    if (content) cost += OutsideWeight * areaOutside(rect, content);
    return cost / area;
}

/**
 * A side for each candidate, in order.
 *
 * Greedy in the order given, so each bubble avoids the ones already placed — a
 * joint optimum would be circular, and source order is at least deterministic
 * and stable. A pinned side is used as given and still becomes an obstacle for
 * everyone after it.
 */
export function resolveSides(
    candidates: readonly BubbleCandidate[],
    obstacles: readonly Rect[],
    content: Rect | undefined,
): BubbleSide[] {
    const sides: BubbleSide[] = [];
    const placed: Rect[] = [];
    for (const candidate of candidates) {
        if (candidate.pinned !== undefined) {
            sides.push(candidate.pinned);
            placed.push(bubbleRect(candidate, candidate.pinned));
            continue;
        }
        let best = SidePreference[0];
        let bestScore = score(
            bubbleRect(candidate, best),
            obstacles,
            placed,
            content,
        );
        for (const side of SidePreference.slice(1)) {
            const next = score(
                bubbleRect(candidate, side),
                obstacles,
                placed,
                content,
            );
            // Strict improvement: a side has to be meaningfully better to win,
            // or a drifting speaker flips sides and widens the frame forever.
            if (next < bestScore - SideMargin) {
                best = side;
                bestScore = next;
            }
        }
        sides.push(best);
        placed.push(bubbleRect(candidate, best));
    }
    return sides;
}
