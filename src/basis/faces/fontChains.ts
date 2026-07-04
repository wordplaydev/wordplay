import type { SupportedFace } from './Fonts';

/**
 * Builders for the app-wide font-family chains set on --wordplay-app-font and
 * --wordplay-code-font. Both end with var(--wordplay-fallback-fonts) (defined
 * in static/fonts/fonts-fallback.css) so that glyphs no earlier face covers fall
 * back to a lazily-downloaded Noto script font instead of tofu.
 */

/** The user's chosen face first (if any), then each locale's preferred app
 * font, then Noto Sans, then the emoji faces. Noto Sans is included so this
 * chain — like every other chain that ends in the fallback var — has the base
 * Latin/punctuation face ahead of the fallbacks; the fallback CSS strips those
 * shared codepoints from each script face's range (see scripts/fonts/
 * stylesheets.ts) to stop WebKit eagerly downloading every script font. */
export function appFontFamilies(
    override: SupportedFace | null,
    localeFaces: string[],
): string {
    return chain(
        [
            ...(override !== null ? [override] : []),
            ...localeFaces,
            'Noto Sans',
            // Fall back to the emoji fonts for emojis, color first.
            'Noto Color Emoji',
            'Noto Emoji',
        ],
        'sans-serif',
    );
}

export function codeFontFamilies(localeFaces: string[]): string {
    return chain(
        [
            ...localeFaces,
            'Noto Sans Mono',
            // Color emoji font before monochrome so skin-tone modifier sequences
            // (e.g. 👍🏽) resolve to a combined glyph rather than splitting into
            // base + standalone modifier swatch.
            'Noto Color Emoji',
            'Noto Emoji',
            'Noto Sans',
        ],
        'monospace',
    );
}

function chain(faces: string[], generic: string): string {
    return [
        ...Array.from(new Set(faces)).map((face) => `"${face}"`),
        'var(--wordplay-fallback-fonts)',
        generic,
    ].join(', ');
}
