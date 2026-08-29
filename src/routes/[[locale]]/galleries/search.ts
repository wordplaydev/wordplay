/**
 * Search over galleries, using the shared search policy in src/util/search.ts.
 * A gallery's name ranks above its description; a match in the description
 * comes back with a short excerpt.
 *
 * Also decides which public galleries are worth opening to search their
 * projects. See {@link galleriesWorthSearching}.
 */

import type Gallery from '@db/galleries/Gallery';
import type Locales from '@locale/Locales';
import {
    excerpt,
    foldEntry,
    searchItems,
    type Searchable,
    type SearchField,
    type SearchLanguages,
} from '@util/search';

/** Priority tiers: a gallery's name beats its description. */
const NAME = 1;
const DESCRIPTION = 2;
/** The word index, which is a prefilter rather than something to display. */
const WORDS = 3;

/** A gallery returned from search, with a snippet when the match wasn't on the name. */
export type GalleryMatch = {
    gallery: Gallery;
    /** A short excerpt of the matching description, present when the match was
     *  not on the gallery's name. */
    matchText?: string;
};

/** All of a gallery's names and descriptions, across every locale it's been
 *  written in, so a reader searching in one language still finds a gallery
 *  named in another — the same reason projects flatten their names (#456). */
function textsOf(record: Record<string, string>): string[] {
    return Object.values(record).filter((text) => text.length > 0);
}

function searchFields(
    gallery: Gallery,
    languages: SearchLanguages,
): SearchField[] {
    const fields: SearchField[] = [];
    const names = textsOf(gallery.getData().name);
    if (names.length > 0)
        fields.push({
            entries: names.map((name) => foldEntry(name, languages)),
            priority: NAME,
        });
    const descriptions = textsOf(gallery.getData().description);
    if (descriptions.length > 0)
        fields.push({
            entries: descriptions.map((text) => foldEntry(text, languages)),
            priority: DESCRIPTION,
        });
    return fields;
}

/**
 * Searches galleries by name and description, best match first. Returns the
 * whole list (no snippets) when the term is empty.
 */
export function searchGalleries(
    galleries: Gallery[],
    term: string,
    locales: Locales,
): GalleryMatch[] {
    if (!term.trim()) return galleries.map((gallery) => ({ gallery }));
    const languages = locales.getLanguages();
    const records: Searchable<Gallery>[] = galleries.map((gallery) => ({
        ref: gallery,
        fields: searchFields(gallery, languages),
    }));
    return searchItems(records, term, languages).map(
        ([gallery, [display, start, end, priority]]) =>
            priority === NAME
                ? { gallery }
                : { gallery, matchText: excerpt(display, start, end) },
    );
}

/**
 * Which galleries could hold a project matching this term.
 *
 * Searching a public gallery's projects means fetching and parsing every one of
 * them, which is the most expensive thing this page can do and grows without
 * bound as galleries are added. `Gallery.words` — the server-maintained fold of
 * each gallery's name, description, and its projects' names (see
 * functions/src/galleryEdited.ts) — is what makes that affordable: it answers
 * "could anything in here match?" from the gallery document alone, so only the
 * galleries that say yes are ever opened.
 *
 * The cost is recall, and it's worth naming: a project whose only match is deep
 * in its source text, inside a gallery whose name, description, and project
 * names all miss, is not found. #1311 asks for gallery project *titles* to be
 * searchable, which this covers exactly; the built-in examples, whose projects
 * are all loaded anyway, are searched in full.
 */
export function galleriesWorthSearching(
    galleries: Gallery[],
    term: string,
    locales: Locales,
): Gallery[] {
    if (!term.trim()) return [];
    const languages = locales.getLanguages();
    const records: Searchable<Gallery>[] = galleries.map((gallery) => ({
        ref: gallery,
        // Name and description are in `words` too, but kept as their own fields
        // so a gallery that matches by name is never dropped when its index is
        // empty — which is exactly the state of a gallery the trigger hasn't
        // reached yet.
        fields: [
            ...searchFields(gallery, languages),
            ...(gallery.getWords().length > 0
                ? [
                      {
                          entries: [
                              foldEntry(
                                  gallery.getWords().join(' '),
                                  languages,
                              ),
                          ],
                          priority: WORDS,
                      },
                  ]
                : []),
        ],
    }));
    return searchItems(records, term, languages).map(([gallery]) => gallery);
}
