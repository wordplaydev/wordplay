import exceedsMoveThreshold from '@components/output/moveThreshold';

/** Where a pointer went down, in viewport coordinates. */
export type PressPoint = { x: number; y: number };

/**
 * Whether a press/release pair is a choice rather than a pan. The menu commits on
 * release, not press: on touch, pressing IS how a scroll starts, so committing on
 * press made a scrollable menu impossible to scroll — every attempt picked
 * something. The threshold comes from `moveThreshold`, so a mouse still commits on
 * a near-still click and a finger gets the slack it needs.
 */
export function isTap(
    press: PressPoint,
    release: { clientX: number; clientY: number; pointerType: string },
): boolean {
    return !exceedsMoveThreshold(
        release.clientX - press.x,
        release.clientY - press.y,
        release.pointerType,
    );
}

/**
 * Whether hovering should select an item or open a submenu. Mouse and pen only:
 * on touch, `pointerenter` fires the instant a finger lands, so it can't be told
 * apart from a tap and would choose an item the moment you touch the list.
 */
export function hoverSelects(pointerType: string): boolean {
    return pointerType !== 'touch';
}
