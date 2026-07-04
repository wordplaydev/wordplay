/**
 * Builds searchable records for the glyph/emoji chooser so it can use the shared
 * search policy in src/util/search.ts. For each emoji codepoint, the localized
 * name ranks above its keywords, which rank above the emoji-group label. Only
 * codepoints with a name (localized emoji names, or English Unicode/Unihan
 * names for everything else) are searchable; the rest carry no text.
 *
 * Pure (no Svelte/store deps) so it can be unit-tested; the chooser feeds it the
 * loaded emoji maps and a group-label resolver.
 */

import type { EmojiMap } from '@db/locales/LocalesDatabase';
import type { SupportedLocale } from '@locale/SupportedLocales';
import {
    foldEntry,
    type Searchable,
    type SearchField,
    type SearchLanguages,
} from '@util/search';
import { codepointKey, type Codepoint } from './Unicode';

/** Priority tiers: name beats keywords beats the emoji-group label. */
const NAME = 1;
const KEYWORD = 2;
const GROUP = 3;

/**
 * Builds a searchable record per codepoint that has localized text. Names and
 * keywords are gathered across all selected locales (so a query in any selected
 * language matches), folded with `languages` for consistent matching against the
 * folded query. `groupLabelFor` returns the codepoint's emoji-group label, if any.
 */
export function buildGlyphSearch(
    codepoints: Codepoint[],
    localeCodes: SupportedLocale[],
    maps: Partial<Record<SupportedLocale, EmojiMap>>,
    groupLabelFor: (code: Codepoint) => string | undefined,
    languages: SearchLanguages,
    /** English names/keywords for non-emoji glyphs (Unicode names + Unihan
     * definitions/pinyin), keyed by codepointKey. Emoji use the localized
     * `maps` above; everything else falls back to this so Han, letters, and
     * symbols become searchable. */
    glyphNames?: Map<string, string[]>,
): Searchable<Codepoint>[] {
    const records: Searchable<Codepoint>[] = [];

    for (const code of codepoints) {
        const key = codepointKey(code.hex);
        const names: string[] = [];
        const keywords: string[] = [];
        for (const localeCode of localeCodes) {
            const entry = maps[localeCode]?.[key];
            if (entry === undefined || entry.length === 0) continue;
            names.push(entry[0]);
            for (const keyword of entry.slice(1)) keywords.push(keyword);
        }
        // Non-emoji glyphs have no localized entry; fall back to the English
        // Unicode/Unihan names so they're searchable at all.
        if (names.length === 0) {
            const entry = glyphNames?.get(key);
            if (entry !== undefined && entry.length > 0) {
                names.push(entry[0]);
                for (const keyword of entry.slice(1)) keywords.push(keyword);
            }
        }

        const fields: SearchField[] = [];
        if (names.length > 0)
            fields.push({
                entries: names.map((n) => foldEntry(n, languages)),
                priority: NAME,
            });
        if (keywords.length > 0)
            fields.push({
                entries: keywords.map((k) => foldEntry(k, languages)),
                priority: KEYWORD,
            });
        const label = groupLabelFor(code);
        if (label !== undefined && label.length > 0)
            fields.push({
                entries: [foldEntry(label, languages)],
                priority: GROUP,
            });

        if (fields.length > 0) records.push({ ref: code, fields });
    }

    return records;
}
