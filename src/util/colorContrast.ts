/**
 * WCAG 2.2 relative luminance and contrast ratio for 6-digit hex colors.
 * Shared by paletteContrast.test.ts (the palette's contrast gate) and the
 * /design page's live contrast column, so the two can never disagree.
 */

export function luminance(hex: string): number {
    const channels = [1, 3, 5].map((offset) => {
        const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return channel <= 0.03928
            ? channel / 12.92
            : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrast(a: string, b: string): number {
    const [lighter, darker] = [luminance(a), luminance(b)].sort(
        (x, y) => y - x,
    );
    return (lighter + 0.05) / (darker + 0.05);
}
