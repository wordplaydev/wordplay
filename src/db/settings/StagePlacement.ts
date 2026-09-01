/**
 * Where the stage sits in the arrangements that lay tiles out on axes, which
 * mirrors every other tile around it. Named by the corner the stage lands in
 * rather than by the mirroring, since the mirroring has no meaning to a creator
 * and the stage's position is what they're choosing.
 */
const StagePlacement = {
    TopLeft: 'top-left',
    TopRight: 'top-right',
    BottomLeft: 'bottom-left',
    BottomRight: 'bottom-right',
} as const;

export type StagePlacementType =
    (typeof StagePlacement)[keyof typeof StagePlacement];

/** The placements in the order their labels and tips appear in
 *  `ui.dialog.settings.mode.placement`, so positional indexing into those
 *  locale arrays doesn't silently depend on this object's key order. */
export const StagePlacementOrder = [
    StagePlacement.TopLeft,
    StagePlacement.TopRight,
    StagePlacement.BottomLeft,
    StagePlacement.BottomRight,
] as const;

export function isTop(placement: StagePlacementType): boolean {
    return (
        placement === StagePlacement.TopLeft ||
        placement === StagePlacement.TopRight
    );
}

export function isLeft(placement: StagePlacementType): boolean {
    return (
        placement === StagePlacement.TopLeft ||
        placement === StagePlacement.BottomLeft
    );
}

export { StagePlacement };
export default StagePlacement;
