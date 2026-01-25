enum Arrangement {
    Responsive = 'responsive',
    Vertical = 'vertical',
    Horizontal = 'horizontal',
    Split = 'split',
    Single = 'single',
    Free = 'free',
}

export function isResizeable(arrangement: Arrangement): boolean {
    return (
        arrangement === Arrangement.Free ||
        arrangement === Arrangement.Vertical ||
        arrangement === Arrangement.Horizontal
    );
}

export default Arrangement;
