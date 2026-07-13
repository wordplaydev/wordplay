/**
 * Glossary search: a thin adapter that builds {@link Searchable} records from a
 * locale's glossary and delegates matching/ranking to the shared search policy
 * in src/util/search.ts. A term's word ranks above its definition.
 */

import { getTermDefinition } from '@locale/Glossary';
import type Locales from '@locale/Locales';
import { foldEntry, type Searchable } from '@util/search';

/** Priority for a match on the term's word (ranks above a definition match). */
const WORD_PRIORITY = 1;
/** Priority for a match in the term's definition. */
const DEFINITION_PRIORITY = 2;

/**
 * Builds a searchable record for each glossary term in the preferred locale:
 * the localized word, and the prose of its concretized definition (so `@term`
 * and `@Concept` cross-references match by their localized words).
 */
export function buildGlossarySearch(locales: Locales): Searchable<string>[] {
    const languages = locales.getLanguages();
    return Object.keys(locales.getLocale().glossary).map((id) => ({
        ref: id,
        fields: [
            {
                entries: [foldEntry(locales.getTermByID(id) ?? id, languages)],
                priority: WORD_PRIORITY,
            },
            {
                entries: getTermDefinition(locales, id)
                    .getWordsTexts()
                    .map((text) => foldEntry(text, languages)),
                priority: DEFINITION_PRIORITY,
            },
        ],
    }));
}
