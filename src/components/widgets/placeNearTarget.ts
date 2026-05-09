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

/** Place a panel near `target` inside `container`.
 *
 * Strategy: try above the target, horizontally centered. If that overflows
 * the left edge, place to the right of the target instead. If that
 * overflows the top edge, place below the target. Then clamp to the right
 * and bottom edges so the panel always stays inside the container, with
 * `margin` pixels of breathing room. */
export function placeNearTarget(
    target: Rect,
    panel: Size,
    container: Size,
    margin = 5,
): Position {
    let top = target.top - panel.height;
    let left = target.left + (target.width - panel.width) / 2;

    if (left < 0) left = target.left + target.width;
    if (left + panel.width + margin >= container.width)
        left = container.width - panel.width - margin;
    if (top < 0) top = target.top + target.height;
    if (top + panel.height + margin >= container.height)
        top = container.height - panel.height - margin;

    return { left, top };
}
