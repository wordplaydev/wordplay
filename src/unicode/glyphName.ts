import type { EmojiMap } from '@db/locales/LocalesDatabase';
import type { SupportedLocale } from '@locale/SupportedLocales';
import { codepointKey } from '@unicode/Unicode';

/**
 * What to call a glyph, in the reader's own language.
 *
 * Lifted out of GlyphChooser so anything that shows a glyph as a control can
 * name it: a reaction pill has to have an accessible name and the announcement
 * for adding one has to say which emoji, and neither is inside the chooser.
 *
 * Prefers the reader's primary locale's CLDR translation, then any other locale
 * they have selected that has loaded, then the English Unicode/Unihan name.
 * Returns an empty string when nothing has a name for it — a codepoint whose
 * locale data hasn't arrived yet gets an unlabeled tooltip rather than a wrong
 * one.
 */
export function localizedGlyphName(
    hex: number[],
    locales: SupportedLocale[],
    maps: Partial<Record<SupportedLocale, EmojiMap>>,
    glyphNames?: Map<string, string[]> | null,
): string {
    const key = codepointKey(hex);
    for (const locale of locales) {
        const entry = maps[locale]?.[key];
        if (entry && entry.length > 0) return entry[0];
    }
    const named = glyphNames?.get(key);
    if (named && named.length > 0) return named[0];
    return '';
}

/** The same, for a glyph already in string form. */
export function localizedNameOfGlyph(
    glyph: string,
    locales: SupportedLocale[],
    maps: Partial<Record<SupportedLocale, EmojiMap>>,
): string {
    return localizedGlyphName(
        [...glyph].map((c) => c.codePointAt(0) ?? 0),
        locales,
        maps,
    );
}
