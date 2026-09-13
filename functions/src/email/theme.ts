/**
 * The app's palette, as literal values an email can use.
 *
 * A mirror of the raw `--*-light` / `--*-dark` pairs in `src/app.html` rather
 * than an import, because `functions/` compiles with its own `rootDir` — the
 * same wall that gives `username.ts` and `reportId.ts` their copies.
 * `emailPaletteSync.test.ts` reads both and fails when they drift.
 *
 * Literal hex rather than `var(--wordplay-…)` because Gmail does not resolve
 * custom properties: a token that reached an email would render as nothing.
 * Values only — the moment this file grows a helper it belongs in `layout.ts`.
 */

/** One mode's colors, named for the `--wordplay-*` role each mirrors. */
export type EmailScheme = {
    /** --wordplay-background */
    background: string;
    /** --wordplay-foreground */
    foreground: string;
    /** --wordplay-border-color */
    border: string;
    /** --wordplay-alternating-color */
    alternating: string;
    /** --wordplay-link-color, the AA gold text variant */
    link: string;
    /** --wordplay-inactive-color, the AA grey text variant */
    dimmed: string;
    /** --wordplay-highlight-color: the gold a salient button is painted */
    action: string;
    /** --wordplay-hover-text: literal black, because white on gold is 3.01:1 */
    actionText: string;
};

export const Light: EmailScheme = {
    background: '#ffffff',
    foreground: '#000000',
    border: '#9f9f9f',
    alternating: '#f3f3f3',
    link: '#8a5f00',
    dimmed: '#6b6b6b',
    action: '#c88800',
    actionText: '#000000',
};

export const Dark: EmailScheme = {
    background: '#000000',
    foreground: '#ffffff',
    border: '#6d6d6d',
    alternating: '#1e1e1e',
    link: '#b67c00',
    dimmed: '#8e8e8e',
    action: '#b67c00',
    // Literal black in both modes: this is text on gold, not text on the page.
    actionText: '#000000',
};

/** --wordplay-border-radius */
export const Radius = '8px';
/** --wordplay-border-width */
export const BorderWidth = '1px';
/** --wordplay-font-size */
export const FontSize = '12pt';
/** --wordplay-small-font-size */
export const SmallFontSize = '10pt';
/** --wordplay-font-weight */
export const FontWeight = '400';

/**
 * The app's font, with fallbacks an email client will actually have. No
 * `@font-face`: only Apple Mail would honor it, and Android's Gmail already
 * has Noto Sans as a system face. The explicit Helvetica/Arial tail matters
 * for Outlook's Word engine, which falls back to Times New Roman when it
 * cannot parse a stack.
 */
export const FontStack = `'Noto Sans','Helvetica Neue',Helvetica,Arial,sans-serif`;

/**
 * 600px rather than `Writing.svelte`'s `max-inline-size: 40em` (≈640px).
 * Outlook's Word engine ignores `max-width` on a div and cannot lay out em
 * widths, and 600px is the width its reading pane is built around. Deliberate
 * divergence from the app measure — not a value to "correct" back to 40em.
 */
export const BodyWidth = 600;
