const Arrangement = {
    Responsive: 'responsive',
    Horizontal: 'horizontal',
    Vertical: 'vertical',
    Split: 'split',
    Single: 'single',
    Free: 'free',
} as const;

export type ArrangementType = (typeof Arrangement)[keyof typeof Arrangement];

/** The arrangements in the order their labels and tips appear in
 *  `ui.dialog.settings.mode.layout`, so positional indexing into those locale
 *  arrays doesn't silently depend on this object's key order. */
export const ArrangementOrder = [
    Arrangement.Responsive,
    Arrangement.Horizontal,
    Arrangement.Vertical,
    Arrangement.Split,
    Arrangement.Single,
    Arrangement.Free,
] as const;

export function isResizeable(arrangement: ArrangementType): boolean {
    return (
        arrangement === Arrangement.Free ||
        arrangement === Arrangement.Vertical ||
        arrangement === Arrangement.Horizontal
    );
}

/** Whether this arrangement lays tiles out on axes, and so has a stage
 *  placement that can mirror it. Responsive counts: it resolves to one of the
 *  two axis arrangements. */
export function hasStagePlacement(arrangement: ArrangementType): boolean {
    return (
        arrangement === Arrangement.Horizontal ||
        arrangement === Arrangement.Vertical ||
        arrangement === Arrangement.Responsive
    );
}

export { Arrangement };
export default Arrangement;
