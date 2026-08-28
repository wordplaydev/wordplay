/**
 * Choosing sides for a container's bubbles, and working out how far they spill.
 *
 * Called by whichever container holds a phrase — the stage, or an arrangement —
 * because that is what knows where its children are relative to each other. The
 * result feeds two things at once: the side each bubble is drawn on, and the
 * extra extent the camera has to frame. Computing those separately would be two
 * answers to one question.
 *
 * Resolution is per container and never redone higher up. A phrase inside a
 * group therefore avoids its group's siblings rather than the whole stage, and
 * measures "would this leave the frame" against the group's box — right for the
 * stage's own children, a knowing approximation inside a group.
 */

import type Output from '@output/Output/Output';
import type Place from '@output/Place/Place';
import type RenderContext from '@output/RenderContext';
import type { BubbleSide } from '@output/Bubble/Bubble';
import {
    bubbleRect,
    resolveSides,
    type BubbleCandidate,
    type Rect,
} from '@output/Bubble/bubbleSides';

/** A child of the container, with the box the container placed it in. */
export type BubbleChild = {
    output: Output;
    place: Place;
    width: number;
    height: number;
    /** What this child's own descendants already spill, in the child's frame. */
    overflow: Rect | undefined;
};

export type ResolvedBubbles = {
    /** The side chosen for each child that has a bubble. */
    sides: Map<Output, BubbleSide>;
    /** Everything bubbles add beyond the container's own box, in its frame. */
    overflow: Rect | undefined;
};

function union(a: Rect | undefined, b: Rect): Rect {
    return a === undefined
        ? b
        : {
              left: Math.min(a.left, b.left),
              right: Math.max(a.right, b.right),
              top: Math.max(a.top, b.top),
              bottom: Math.min(a.bottom, b.bottom),
          };
}

/** Move a rectangle from a child's frame into its parent's. */
function offset(rect: Rect, place: Place): Rect {
    return {
        left: rect.left + place.x,
        right: rect.right + place.x,
        top: rect.top + place.y,
        bottom: rect.bottom + place.y,
    };
}

export default function resolveBubbles(
    children: readonly BubbleChild[],
    content: Rect | undefined,
    context: RenderContext,
): ResolvedBubbles {
    const sides = new Map<Output, BubbleSide>();
    let overflow: Rect | undefined = undefined;

    // Whatever descendants already spill comes along regardless of any bubble here.
    for (const child of children)
        if (child.overflow)
            overflow = union(overflow, offset(child.overflow, child.place));

    // Every child's box, which is what a bubble should try not to cover.
    const boxes: Rect[] = children.map((child) => ({
        left: child.place.x,
        right: child.place.x + child.width,
        bottom: child.place.y,
        top: child.place.y + child.height,
    }));

    const candidates: BubbleCandidate[] = [];
    const owners: Output[] = [];
    children.forEach((child, index) => {
        const box = child.output.getBubbleBox(context);
        if (box === undefined) return;
        candidates.push({
            anchor: boxes[index],
            width: box.width,
            height: box.height,
            tail: box.tail,
            pinned: child.output.getPinnedBubbleSide(),
        });
        owners.push(child.output);
    });

    if (candidates.length === 0) return { sides, overflow };

    const chosen = resolveSides(candidates, boxes, content);
    chosen.forEach((side, index) => {
        sides.set(owners[index], side);
        overflow = union(overflow, bubbleRect(candidates[index], side));
    });

    return { sides, overflow };
}
