import type Concept from '@concepts/Concept';
import type { PurposeType } from '@concepts/Purpose';

/** The guide's top-level sections: language/code concepts, how-to guides, and
 *  the glossary of key terms. */
export type GuideMode = 'language' | 'howto' | 'glossary';

/**
 * One location in the guide's navigation history:
 * - `section`: a browsing page for a section (mode) + subsection (purpose). The bottom
 *   of a guide's history is always a section — that section is "home".
 * - `concept`: a concept being viewed.
 * - `search`: a search-results page for a query.
 *
 * Duplicate locations are allowed — the only revisitation special case (clicking a link
 * to the concept you're already on) is handled by rendering that link inactive, so it
 * never reaches this stack.
 */
export type GuidePlace =
    | { kind: 'section'; mode: GuideMode; purpose: PurposeType }
    | { kind: 'concept'; concept: Concept }
    | { kind: 'search'; query: string };

/** A flat stack of guide locations; the last element is the current location. */
export type GuideHistory = GuidePlace[];

/** The concept currently being viewed, if the top of the history is a concept. */
export function currentConcept(history: GuideHistory): Concept | undefined {
    const top = history.at(-1);
    return top?.kind === 'concept' ? top.concept : undefined;
}

/** The active search query, if the top of the history is a search. */
export function currentSearch(history: GuideHistory): string | undefined {
    const top = history.at(-1);
    return top?.kind === 'search' ? top.query : undefined;
}

/** The active browse section: the topmost section location's mode + purpose, if any. */
export function activeSection(
    history: GuideHistory,
): { mode: GuideMode; purpose: PurposeType } | undefined {
    for (let i = history.length - 1; i >= 0; i--) {
        const place = history[i];
        if (place.kind === 'section')
            return { mode: place.mode, purpose: place.purpose };
    }
    return undefined;
}

/**
 * Choose a browse section/subsection. Moving *between* sections (the top is already a
 * section) modifies the current location in place; otherwise (the top is a concept or
 * search — i.e. we've moved away from a section) a new section location is added.
 */
export function navigateSection(
    history: GuideHistory,
    mode: GuideMode,
    purpose: PurposeType,
): GuideHistory {
    const place: GuidePlace = { kind: 'section', mode, purpose };
    const top = history.at(-1);
    return top?.kind === 'section'
        ? [...history.slice(0, -1), place]
        : [...history, place];
}

/** Push a concept location onto the history. */
export function pushConcept(
    history: GuideHistory,
    concept: Concept,
): GuideHistory {
    return [...history, { kind: 'concept', concept }];
}

/**
 * Reconcile the search-box text with the history:
 * - empty query: pop a trailing search location, if any (returning to where the
 *   search was started from).
 * - non-empty query, top is a search: replace its query (refine the search in place).
 * - non-empty query, top is a concept or home: push a new search location.
 *
 * Returns the *same* array reference when nothing needs to change, so callers can use
 * referential equality to avoid redundant store writes (and reactivity loops).
 */
export function reconcileSearch(
    history: GuideHistory,
    query: string,
): GuideHistory {
    const trimmed = query.trim();
    const top = history.at(-1);
    if (trimmed.length === 0)
        return top?.kind === 'search' ? history.slice(0, -1) : history;
    if (top?.kind === 'search')
        return top.query === query
            ? history
            : [...history.slice(0, -1), { kind: 'search', query }];
    return [...history, { kind: 'search', query }];
}

/** Pop the history down to (and including) the location at `index`. */
export function popTo(history: GuideHistory, index: number): GuideHistory {
    return history.slice(0, index + 1);
}

/**
 * Remap the concept locations through `map` (e.g. when the concept index is rebuilt
 * after a project edit), dropping any concept that no longer resolves. Section and
 * search locations are preserved unchanged.
 */
export function remapConcepts(
    history: GuideHistory,
    map: (concept: Concept) => Concept | undefined,
): GuideHistory {
    const result: GuideHistory = [];
    for (const place of history) {
        if (place.kind === 'concept') {
            const mapped = map(place.concept);
            if (mapped) result.push({ kind: 'concept', concept: mapped });
        } else result.push(place);
    }
    return result;
}

/** True if two locations are equivalent (same concept, search query, or section). */
export function samePlace(a: GuidePlace, b: GuidePlace): boolean {
    if (a.kind === 'concept' && b.kind === 'concept')
        return a.concept.isEqualTo(b.concept);
    if (a.kind === 'search' && b.kind === 'search') return a.query === b.query;
    if (a.kind === 'section' && b.kind === 'section')
        return a.mode === b.mode && a.purpose === b.purpose;
    return false;
}

/** True if two histories have the same locations in the same order. */
export function sameHistory(a: GuideHistory, b: GuideHistory): boolean {
    return (
        a.length === b.length && a.every((place, i) => samePlace(place, b[i]))
    );
}
