/** A box, in CSS pixels. */
export type Size = { width: number; height: number };

/** A point in the menu's containing block's coordinate space. */
export type Point = { left: number; top: number };

/** Where the menu wants to go, and the box that clips it. */
export type MenuPosition = Point & { container: Size };

/**
 * Clamp the menu's ideal position into the box that actually clips it —
 * ProjectView's `.project`, which is `overflow: hidden` and is the menu's
 * containing block. This used to clamp against the window instead, which is a
 * no-op whenever the project is shorter or narrower than the viewport (a phone,
 * or the tutorial's split screen); a menu anchored near the project's bottom
 * edge then landed past it and was clipped away entirely, so opening the menu
 * looked like nothing happening.
 *
 * `Math.max(0, …)` matters too: a menu taller than its container would otherwise
 * be pushed off the top, which is just as invisible.
 */
export function placeMenu(position: Point, menu: Size, container: Size): Point {
    return {
        left: Math.max(
            0,
            Math.min(position.left, container.width - menu.width),
        ),
        top: Math.max(
            0,
            Math.min(position.top, container.height - menu.height),
        ),
    };
}

/**
 * Whether a submenu opening to the inline end would spill out of the container,
 * and so should open toward the inline start instead.
 */
export function submenuFlips(
    menuLeft: number,
    menuWidth: number,
    container: Size,
): boolean {
    return menuLeft + menuWidth * 2 > container.width;
}

/**
 * The tallest the menu may be: never more than the box that clips it. Without
 * this a `30vh` menu can exceed a short container and be unreachable no matter
 * where it's placed.
 */
export function menuMaxHeight(container: Size): number {
    return container.height;
}
