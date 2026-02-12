enum Arrangement {
    Responsive = 'responsive',
    Horizontal = 'horizontal',
    Vertical = 'vertical',
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
