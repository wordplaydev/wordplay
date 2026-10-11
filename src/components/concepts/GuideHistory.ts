import type Concept from '#concepts/Concept.ts';
import type ConceptIndex from '#concepts/ConceptIndex.ts';
import { Purpose, type PurposeType } from '#concepts/Purpose.ts';
import type { AppPath } from '#util/appPath.ts';
import {
    BORROW_SYMBOL,
    DOCUMENTATION_SYMBOL,
    IDEA_SYMBOL,
} from '#parser/Symbols.ts';

/**
 * The guide's top-level sections, in tab order: an escalation in the scope of help, from
 * the constructs themselves through other people's code and recipes to the vocabulary all
 * three use.
 *
 * **Positional** — `ui.docs.mode.browse` and the tab icons are indexed by these, so a
 * section added in the middle silently relabels every one after it, and `locales-fix`
 * cannot insert into a positional tuple. Here rather than in `Documentation.svelte` so
 * `tourSteps.ts` and `placeLabel.ts` can read it without importing a component.
 */
export const Modes = ['language', 'kits', 'howto', 'glossary'] as const;

export type GuideMode = (typeof Modes)[number];

/**
 * The section the guide opens on.
 *
 * Code, because the order above makes it the least specific kind of help and so the right
 * place to land. It used to be `$blocks ? 'language' : 'howto'`, which was left behind when
 * the effect that *pinned* the guide to `language` in blocks mode was removed — the guide
 * was the drag palette then, and the Wellspring is now.
 */
export const DefaultMode: GuideMode = 'language';

/** The code subsection the guide opens on, and the one a bare "code" link lands on. */
export const DefaultPurpose: PurposeType = Purpose.Outputs;

/** One glyph per section, in `Modes`' order — the third positional list, kept here with
 *  the other two so they can only be wrong together. */
export const ModeIcons: readonly string[] = [
    DOCUMENTATION_SYMBOL,
    BORROW_SYMBOL,
    IDEA_SYMBOL,
    '📖',
];

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
    for (const place of [...history].reverse())
        if (place.kind === 'section')
            return { mode: place.mode, purpose: place.purpose };
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
        a.length === b.length &&
        a.every((place, i) => {
            const other = b[i];
            return other !== undefined && samePlace(place, other);
        })
    );
}

/**
 * Where a location lives in the guide's hierarchy: its section, the code section's
 * subsection, and for a sub-concept, the concept that owns it. This is where the reader
 * *is*, not how they got there, which the browser's history already records — so the
 * section chooser and the breadcrumb both describe it, and a concept reached from a
 * search names the section it belongs to rather than the one browsed before.
 */
export type GuideLocation = {
    mode: GuideMode;
    /** The code subsection, when the location has one the purpose filter offers. */
    purpose: PurposeType | undefined;
    /** The concept a sub-concept (an input, a property) belongs to. */
    owner: Concept | undefined;
};

/** The purposes the code section's filter never offers (see `purposeFilters.test.ts`). */
const Unfiltered: readonly PurposeType[] = [
    Purpose.Hidden,
    Purpose.How,
    Purpose.GalleryHow,
];

/**
 * The location a place lives at, or `undefined` for a search, which belongs to no
 * section. `ownerOf` is the concept index's owner lookup, passed in so this module stays
 * free of the index (and `tourSteps.ts`, which reads `Modes`, stays light).
 */
export function locationOf(
    place: GuidePlace,
    ownerOf: (concept: Concept) => Concept | undefined,
): GuideLocation | undefined {
    if (place.kind === 'search') return undefined;
    if (place.kind === 'section')
        return {
            mode: place.mode,
            purpose: place.mode === 'language' ? place.purpose : undefined,
            owner: undefined,
        };
    const purpose = place.concept.getPurpose();
    if (purpose === Purpose.How || purpose === Purpose.GalleryHow)
        return { mode: 'howto', purpose: undefined, owner: undefined };
    const owner = ownerOf(place.concept);
    const filed = owner?.getPurpose() ?? purpose;
    return {
        mode: 'language',
        purpose: Unfiltered.includes(filed) ? undefined : filed,
        owner,
    };
}

/**
 * The section landing a place belongs to, as a history location: the place itself for
 * a section, the section a concept is filed under, and `fallback` for a search.
 */
export function landingOf(
    place: GuidePlace,
    ownerOf: (concept: Concept) => Concept | undefined,
    fallback: GuidePlace & { kind: 'section' },
): GuidePlace & { kind: 'section' } {
    if (place.kind === 'section') return place;
    const location = locationOf(place, ownerOf);
    if (location === undefined) return fallback;
    return {
        kind: 'section',
        mode: location.mode,
        purpose: location.purpose ?? DefaultPurpose,
    };
}

/** The path segment naming each section, fixed English so a link means the same in
 *  every locale. */
export const SectionSlugs: Record<GuideMode, string> = {
    language: 'code',
    kits: 'kits',
    howto: 'howto',
    glossary: 'glossary',
};

/** A code subsection's path segment. */
export function purposeSlug(purpose: PurposeType): string {
    return purpose.toLowerCase();
}

/** The path segments after `/guide` that name a concept: where it is filed, as its
 *  breadcrumb reads, then its owner's token for a sub-concept, then its own. */
export function conceptPathSegments(
    concept: Concept,
    index: Pick<ConceptIndex, 'getConceptToken' | 'getConceptOwner'>,
): string[] {
    const location = locationOf({ kind: 'concept', concept }, (c) =>
        index.getConceptOwner(c),
    );
    const segments: string[] = [];
    if (location !== undefined) {
        segments.push(SectionSlugs[location.mode]);
        if (location.purpose !== undefined)
            segments.push(purposeSlug(location.purpose));
        if (location.owner !== undefined)
            segments.push(index.getConceptToken(location.owner));
    }
    segments.push(index.getConceptToken(concept));
    return segments;
}

/** The guide URL that shows one concept, which a concept link points at so it can be
 *  opened in a new tab or copied, even where a click navigates in place. Here rather
 *  than in `guidePath.ts` because concept links are on every page's graph. */
export function guideConceptURL(
    concept: Concept,
    index: Pick<ConceptIndex, 'getConceptToken' | 'getConceptOwner'>,
): AppPath {
    return `/guide/${conceptPathSegments(concept, index).map(encodeURIComponent).join('/')}`;
}
