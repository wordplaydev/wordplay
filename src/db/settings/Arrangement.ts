const Arrangement = {
    Responsive: 'responsive',
    Horizontal: 'horizontal',
    Vertical: 'vertical',
    Split: 'split',
    Single: 'single',
    Free: 'free',
} as const;

export type ArrangementType = (typeof Arrangement)[keyof typeof Arrangement];

export function isResizeable(arrangement: ArrangementType): boolean {
    return (
        arrangement === Arrangement.Free ||
        arrangement === Arrangement.Vertical ||
        arrangement === Arrangement.Horizontal
    );
}

export { Arrangement };
export default Arrangement;
