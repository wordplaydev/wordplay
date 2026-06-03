/**
 * Shared, dependency-light text search used across the app (concepts, tutorial,
 * glyphs, localization, projects). The matching policy is deliberately simple and
 * predictable:
 *
 *   1. An exact (case-folded) substring match always wins and ranks first.
 *   2. Otherwise a whole word within {@link maxEditsForQuery} edits of the query
 *      counts as a fuzzy match — tolerance scales with query length, so it's
 *      enough to forgive a typo or two without being so loose that a 3-letter
 *      query like "col" matches "to"/"you" or "gesture" matches "adventure".
 *
 * Each searchable item exposes one or more *fields* with a priority (e.g. a
 * concept's name outranks its docs); results are ordered exact-before-fuzzy, then
 * by field priority, then by closeness and where/how tightly the match landed
 * (see {@link rankBefore}). Callers build {@link Searchable} records from their own
 * data and call {@link searchItems}; folding, ranking, and highlighting offsets
 * are all shared here.
 */

import levenshtein from '@util/levenshtein';
import UnicodeString from '@unicode/UnicodeString';
import type LanguageCode from '@locale/LanguageCode';

/**
 * The locale language(s) to fold searchable text and queries with — typically
 * `Locales.getLanguages()` (e.g. `['en', 'es']`). Folding both sides with the
 * same languages keeps matching locale-aware and consistent.
 */
export type SearchLanguages = LanguageCode | LanguageCode[];

/** A single searchable string: the original-cased form shown in the UI and a locale-folded form used for matching. */
export type SearchEntry = { display: string; lower: string };

/** A group of entries that share a relevance priority (lower numbers rank first). */
export type SearchField = { entries: SearchEntry[]; priority: number };

/** A searchable item: an opaque ref plus its prioritized text fields. */
export type Searchable<T> = { ref: T; fields: SearchField[] };

/**
 * A search match: the matched display string, the `[start, end)` range within it
 * that matched (for highlighting), and the field priority that produced it.
 */
export type SearchMatch = [
    display: string,
    start: number,
    end: number,
    priority: number,
];

/** Matches whole "words" (letter/number runs) for fuzzy comparison and offsets. */
const WORD = /[\p{L}\p{N}]+/gu;

/**
 * The most edits a whole word may deviate from the query and still count as a
 * fuzzy match. Typo likelihood grows with length, so tolerance does too: 0 edits
 * for queries up to 3 graphemes (so "col" matches "Color" but not "to"/"you"),
 * then +1 per 3 graphemes (4–6 → 1, 7–9 → 2, …). Counted in graphemes so emoji
 * and combining sequences count as one character.
 */
export function maxEditsForQuery(query: string): number {
    return Math.max(
        0,
        Math.floor((new UnicodeString(query).getLength() - 1) / 3),
    );
}

/** Locale-folds a display string into a {@link SearchEntry}. */
export function foldEntry(
    display: string,
    languages: SearchLanguages,
): SearchEntry {
    return { display, lower: display.toLocaleLowerCase(languages) };
}

/** The matched range within an entry and how far the query deviated. */
type EntryMatch = { start: number; end: number; distance: number };

/**
 * Finds where `q` matches `entry`: a literal substring (distance 0) if present,
 * otherwise the closest whole word within `maxEdits` edits. Returns undefined if
 * nothing is close enough. `q` must already be locale-folded.
 */
function matchEntry(
    entry: SearchEntry,
    q: string,
    maxEdits: number,
): EntryMatch | undefined {
    const exact = entry.lower.indexOf(q);
    if (exact >= 0) return { start: exact, end: exact + q.length, distance: 0 };
    if (maxEdits === 0) return undefined; // short queries match by substring only

    let best: EntryMatch | undefined;
    for (const word of entry.lower.matchAll(WORD)) {
        const distance = levenshtein(word[0], q, maxEdits);
        if (
            distance <= maxEdits &&
            (best === undefined || distance < best.distance)
        )
            best = {
                start: word.index,
                end: word.index + word[0].length,
                distance,
            };
    }
    return best;
}

/** The best match within one field, carrying the display string to highlight. */
type FieldMatch = EntryMatch & { display: string };

/** Returns the closest match across a field's entries, or undefined. */
function matchField(
    field: SearchField,
    q: string,
    maxEdits: number,
): FieldMatch | undefined {
    let best: FieldMatch | undefined;
    for (const entry of field.entries) {
        const match = matchEntry(entry, q, maxEdits);
        if (
            match !== undefined &&
            (best === undefined || match.distance < best.distance)
        )
            best = { ...match, display: entry.display };
        if (best?.distance === 0) break; // can't beat an exact match
    }
    return best;
}

/** The ranking key for a match: enough to order results consistently. */
type RankKey = {
    priority: number;
    distance: number;
    start: number;
    length: number;
};

/**
 * True if match `a` should rank before `b`. Exact matches (distance 0) always
 * beat fuzzy ones — so an exact match in a lower-priority field outranks a loose
 * fuzzy match in a higher-priority one — then field priority, then closeness,
 * then the earliest/tightest match.
 */
function rankBefore(a: RankKey, b: RankKey): boolean {
    const aFuzzy = a.distance > 0 ? 1 : 0;
    const bFuzzy = b.distance > 0 ? 1 : 0;
    if (aFuzzy !== bFuzzy) return aFuzzy < bFuzzy;
    if (a.priority !== b.priority) return a.priority < b.priority;
    if (a.distance !== b.distance) return a.distance < b.distance;
    if (a.start !== b.start) return a.start < b.start;
    return a.length < b.length;
}

/**
 * Searches `records` for `query`, returning `[ref, match]` tuples ordered by
 * {@link rankBefore} (exact-before-fuzzy, then priority, then closeness). `query`
 * is folded with `languages` (the same locales the records were folded with).
 * Returns [] for an empty query.
 */
export function searchItems<T>(
    records: Searchable<T>[],
    query: string,
    languages: SearchLanguages,
): [T, SearchMatch][] {
    const q = query.trim().toLocaleLowerCase(languages);
    if (q.length === 0) return [];

    // Fuzziness allowance scales with the query length (computed once).
    const maxEdits = maxEditsForQuery(q);

    const matches: (RankKey & { result: [T, SearchMatch] })[] = [];

    for (const record of records) {
        // Represent the record by its best-ranking matching field.
        let best: (RankKey & { result: [T, SearchMatch] }) | undefined;
        for (const field of record.fields) {
            const match = matchField(field, q, maxEdits);
            if (match === undefined) continue;
            const result: [T, SearchMatch] = [
                record.ref,
                [match.display, match.start, match.end, field.priority],
            ];
            const entry = {
                result,
                priority: field.priority,
                distance: match.distance,
                start: match.start,
                length: match.display.length,
            };
            if (best === undefined || rankBefore(entry, best)) best = entry;
        }
        if (best !== undefined) matches.push(best);
    }

    matches.sort((a, b) => (rankBefore(a, b) ? -1 : rankBefore(b, a) ? 1 : 0));
    return matches.map((m) => m.result);
}

/**
 * Characters of context to show on each side of a matched range when excerpting
 * a long string. Chosen to fit comfortably on a single line.
 */
const EXCERPT_CONTEXT = 40;

/**
 * Clips a window around `[start, end)` in `display`, adding ellipses when the
 * window doesn't reach an end. Used to show a short snippet of where a match
 * landed inside long text (doc/source/dialog). When `mark` is given, the matched
 * range is wrapped in it on both sides (e.g. `'*'` to render bold in Markup);
 * without it, the window is trimmed for a clean plain-text snippet.
 */
export function excerpt(
    display: string,
    start: number,
    end: number,
    context: number = EXCERPT_CONTEXT,
    mark: string = '',
): string {
    const from = Math.max(0, start - context);
    const to = Math.min(display.length, end + context);
    const prefix = from > 0 ? '…' : '';
    const suffix = to < display.length ? '…' : '';
    if (mark === '') return prefix + display.slice(from, to).trim() + suffix;
    const before = display.slice(from, start);
    const matched = display.slice(start, end);
    const after = display.slice(end, to);
    return `${prefix}${before}${mark}${matched}${mark}${after}${suffix}`;
}
