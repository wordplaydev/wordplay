/** Geometry helpers shared by Hint and Tour for placing a floating panel
 * near a target element. The function is pure and coordinate-agnostic: pass
 * viewport-relative inputs to position against the viewport, or
 * dialog-relative inputs to position inside a `<dialog>`. */

export type Rect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

export type Size = { width: number; height: number };

export type Position = { left: number; top: number };

/** Which side of the target the panel was placed on. */
export type Placement = 'above' | 'below';

/** The vertical room on each side of the target, less the margin. A caller that
 *  can cap its panel's height uses this so a tall panel scrolls within its side
 *  instead of being placed somewhere it doesn't fit. */
export function roomAround(
    target: Rect,
    container: Size,
    margin = 5,
): { above: number; below: number } {
    return {
        above: Math.max(0, target.top - margin),
        below: Math.max(
            0,
            container.height - (target.top + target.height) - margin,
        ),
    };
}

/** Place a panel near `target` inside `container`.
 *
 * Horizontally: centered on the target, nudged inside whichever edge it
 * overflows.
 *
 * Vertically: above the target if it fits there, else below. It is never placed
 * *over* the target — the bottom clamp that used to do that could pull a tall
 * panel back across the button that opened it, which on touch put a control
 * under the finger that had just tapped, so the next contact chose something the
 * creator never aimed at. If the panel fits on neither side, it takes the
 * roomier one and overflows the container edge rather than covering its
 * target; callers that can cap their height should use `roomAround` first. */
export function placeNearTarget(
    target: Rect,
    panel: Size,
    container: Size,
    margin = 5,
): Position & { placement: Placement } {
    let left = target.left + (target.width - panel.width) / 2;
    if (left < 0) left = target.left + target.width;
    if (left + panel.width + margin >= container.width)
        left = container.width - panel.width - margin;

    const room = roomAround(target, container, margin);
    const placement: Placement =
        panel.height <= room.above
            ? 'above'
            : panel.height <= room.below
              ? 'below'
              : room.above >= room.below
                ? 'above'
                : 'below';

    return {
        left,
        top:
            placement === 'above'
                ? target.top - panel.height
                : target.top + target.height,
        placement,
    };
}
