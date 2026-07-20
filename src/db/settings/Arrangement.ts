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

export { Arrangement };
export default Arrangement;
