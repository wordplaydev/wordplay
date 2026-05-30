/**
 * Concept search: a thin adapter that builds {@link Searchable} records from
 * concepts and delegates matching/ranking to the shared search policy in
 * src/util/search.ts. A concept's names rank above its documentation.
 */

import { foldEntry, type Searchable, type SearchLanguages } from '@util/search';

export { searchItems as searchConcepts, type SearchMatch } from '@util/search';

/** Priority for a name match (ranks above a documentation match). */
const NAME_PRIORITY = 1;
/** Priority for a documentation match. */
const DOC_PRIORITY = 2;

/**
 * Builds a searchable record for one concept from its display names and the text
 * segments of its documentation, folded with the given locales.
 */
export function makeSearchable<T>(
    ref: T,
    names: string[],
    docs: string[],
    languages: SearchLanguages,
): Searchable<T> {
    return {
        ref,
        fields: [
            {
                entries: names.map((n) => foldEntry(n, languages)),
                priority: NAME_PRIORITY,
            },
            {
                entries: docs.map((d) => foldEntry(d, languages)),
                priority: DOC_PRIORITY,
            },
        ],
    };
}
