/**
 * Chooses what the logo's speech bubble says: the exemplar glyph of the
 * viewer's dominant script, and the pool of glyphs the landing page cycles
 * through to convey that the bubble can say anything.
 */

import { getLocaleWritingScript } from '#locale/LanguageCode.ts';
import { stringToLocale, type Locale } from '#locale/Locale.ts';
import { Scripts, type ScriptMetadata } from '#locale/Scripts.ts';
import { SupportedLocales } from '#locale/SupportedLocales.ts';
import { DEFAULT_LOGO_GLYPH } from './logoMark';

/** A few emoji at the end of the cycle pool, saying the bubble can say more
 *  than letters. All are covered by the bundled Noto Emoji face
 *  (logoGlyph.test.ts verifies renderability). */
const LOGO_EMOJI = ['😀', '🎭', '🌏'];

/** The exemplar glyph of the script a locale is written in, falling back to
 *  Latin 'a' for scripts without one. */
export function getLogoGlyphForLocale(locale: Locale): string {
    const script = getLocaleWritingScript(locale);
    // Annotate to widen from the per-entry literal types, whose optional
    // `glyph` only exists on some entries.
    const meta: ScriptMetadata = Scripts[script];
    return meta.glyph ?? DEFAULT_LOGO_GLYPH;
}

/** The glyphs the landing page's logo cycles through: the viewer's own
 *  script's glyph first, then the other supported locales' dominant-script
 *  glyphs (deduplicated), then a few emoji. */
export function getLogoCyclePool(primary: Locale): string[] {
    const pool = [getLogoGlyphForLocale(primary)];
    for (const name of SupportedLocales) {
        const locale = stringToLocale(name);
        if (locale === undefined) continue;
        const glyph = getLogoGlyphForLocale(locale);
        if (!pool.includes(glyph)) pool.push(glyph);
    }
    for (const emoji of LOGO_EMOJI) if (!pool.includes(emoji)) pool.push(emoji);
    return pool;
}

/** One entry of the landing page's synchronized cycle: a supported locale
 *  paired with its dominant script's glyph, or a glyph alone (the emoji at
 *  the end of the cycle, during which the language label holds still). */
export type LogoCycleEntry = {
    locale: string | undefined;
    glyph: string;
};

/** The landing page's synchronized cycle: the language chooser's rotating
 *  label and the logo's glyph advance together, the language driving the
 *  script — every supported locale paired with its script's glyph, then the
 *  glyph pool's emoji entries, a union of both lists so neither loses
 *  coverage. */
export function getLogoLanguageCycle(): LogoCycleEntry[] {
    const entries: LogoCycleEntry[] = [];
    for (const name of SupportedLocales) {
        const locale = stringToLocale(name);
        if (locale === undefined) continue;
        entries.push({ locale: name, glyph: getLogoGlyphForLocale(locale) });
    }
    for (const emoji of LOGO_EMOJI)
        entries.push({ locale: undefined, glyph: emoji });
    return entries;
}
