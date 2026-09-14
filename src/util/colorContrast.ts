/**
 * WCAG 2.2 relative luminance and contrast ratio for 6-digit hex colors.
 * Shared by paletteContrast.test.ts (the palette's contrast gate) and the
 * /design page's live contrast column, so the two can never disagree.
 */

export function luminance(hex: string): number {
    const channel = (offset: number) => {
        const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return value <= 0.03928
            ? value / 12.92
            : Math.pow((value + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

export function contrast(a: string, b: string): number {
    const one = luminance(a);
    const other = luminance(b);
    const lighter = Math.max(one, other);
    const darker = Math.min(one, other);
    return (lighter + 0.05) / (darker + 0.05);
}
