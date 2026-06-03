/**
 * Builds the searchable field tiers for one localization entry, so the localize
 * page can use the shared search policy in src/util/search.ts. The dotted path
 * key ranks first (translators usually search by key), then its TSDoc
 * description, then the translated value itself (so a string can be found by a
 * word from its content). Folded with the active locale for case-insensitive,
 * locale-aware matching.
 */

import {
    foldEntry,
    type SearchField,
    type SearchLanguages,
} from '@util/search';

/** Path key tier (ranks first). */
const PATH = 1;
/** TSDoc description tier. */
const DESCRIPTION = 2;
/** Translated value tier. */
const VALUE = 3;

/** Builds the prioritized search fields for a localization entry. */
export function localizeFields(
    pathStr: string,
    description: string | undefined,
    value: string | string[],
    languages: SearchLanguages,
): SearchField[] {
    const fields: SearchField[] = [
        { entries: [foldEntry(pathStr, languages)], priority: PATH },
    ];
    if (description !== undefined && description.length > 0)
        fields.push({
            entries: [foldEntry(description, languages)],
            priority: DESCRIPTION,
        });
    const valueText = Array.isArray(value) ? value.join(' ') : value;
    if (valueText.trim().length > 0)
        fields.push({
            entries: [foldEntry(valueText, languages)],
            priority: VALUE,
        });
    return fields;
}
