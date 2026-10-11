import {
    DefaultMode,
    DefaultPurpose,
    Modes,
    conceptPathSegments,
    purposeSlug,
    SectionSlugs,
    type GuideMode,
    type GuidePlace,
} from '#components/concepts/GuideHistory.ts';
import type Concept from '#concepts/Concept.ts';
import type ConceptIndex from '#concepts/ConceptIndex.ts';
import { Purpose, type PurposeType } from '#concepts/Purpose.ts';

/**
 * A guide location is a path, shaped like its breadcrumb: `/guide/code/outputs/Phrase`.
 *
 * Paths rather than query params because a prerendered page is one file per path: with
 * every location at `/guide?…`, all of them were served the default landing, which sat on
 * screen until the page hydrated. Section landings are prerendered at their own paths in
 * every locale; concepts, searches, and kits are not, so the host serves them the empty
 * app shell and the client renders the location straight away.
 *
 * Slugs are fixed English, never localized, so a link means the same in every locale.
 */

/** The segment under which search results live. Not a section: it has no tab. */
export const SearchSlug = 'search';

const Purposes: readonly PurposeType[] = Object.values(Purpose);

function purposeFromSlug(slug: string | undefined): PurposeType | undefined {
    return Purposes.find((purpose) => purposeSlug(purpose) === slug);
}

function modeFromSlug(slug: string | undefined): GuideMode | undefined {
    return Modes.find((mode) => SectionSlugs[mode] === slug);
}

/** A path to a guide location, which is always one of the app's routes. */
export type GuidePath = '/guide' | `/guide/${string}`;

/** What a guide path names, before any concept in it is resolved. */
export type ParsedGuidePath =
    | { kind: 'section'; mode: GuideMode; purpose: PurposeType }
    | { kind: 'search' }
    /** One token for a concept, two for a sub-concept (owner, then member). */
    | { kind: 'concept'; tokens: [string] | [string, string] }
    | { kind: 'kit'; name: string };

/**
 * Read the segments after `/guide`, already decoded. Anything unrecognized names the
 * default landing, so a mistyped link lands somewhere rather than nowhere.
 */
export function parseGuidePath(segments: readonly string[]): ParsedGuidePath {
    const landing: ParsedGuidePath = {
        kind: 'section',
        mode: DefaultMode,
        purpose: DefaultPurpose,
    };
    const [first, ...rest] = segments;
    if (first === undefined) return landing;
    if (first === SearchSlug) return { kind: 'search' };
    const mode = modeFromSlug(first);
    if (mode === undefined) return landing;
    if (mode === 'kits' && rest.length > 0)
        return { kind: 'kit', name: rest.join('/') };
    // A code page may name its subsection before any concept.
    const purpose = mode === 'language' ? purposeFromSlug(rest[0]) : undefined;
    const tokens = purpose === undefined ? rest : rest.slice(1);
    const [owner, member] = tokens;
    if (owner !== undefined && (mode === 'language' || mode === 'howto'))
        return {
            kind: 'concept',
            tokens: member === undefined ? [owner] : [owner, member],
        };
    return { kind: 'section', mode, purpose: purpose ?? DefaultPurpose };
}

/** The concept a parsed path's tokens name, if the index has it. */
export function conceptFromTokens(
    index: ConceptIndex,
    tokens: readonly string[],
): Concept | undefined {
    const [owner, member] = tokens;
    if (owner === undefined) return undefined;
    return member === undefined
        ? index.getConceptByToken(owner)
        : index.getSubConcept(owner, member);
}

/** Join decoded segments into a guide path, encoding each. */
function join(segments: readonly string[]): GuidePath {
    return segments.length === 0
        ? '/guide'
        : `/guide/${segments.map(encodeURIComponent).join('/')}`;
}

/**
 * The path for a location. A search's query is not part of the path; it rides in
 * `?query=`, since it changes with every keystroke and names no page of its own.
 */
export function placePath(
    place: GuidePlace,
    index: Pick<ConceptIndex, 'getConceptToken' | 'getConceptOwner'>,
): GuidePath {
    if (place.kind === 'search') return join([SearchSlug]);
    if (place.kind === 'concept')
        return join(conceptPathSegments(place.concept, index));
    if (place.mode !== 'language') return join([SectionSlugs[place.mode]]);
    return place.purpose === DefaultPurpose
        ? join([])
        : join([SectionSlugs.language, purposeSlug(place.purpose)]);
}

/** The path for a kit's page, its `username/name` as two segments. */
export function kitPath(name: string): GuidePath {
    return join([SectionSlugs.kits, ...name.split('/')]);
}

/** Whether a path segment names a section, as the landing route's matcher asks. */
export function isGuideSectionSlug(slug: string): boolean {
    return modeFromSlug(slug) !== undefined;
}

/** Whether a path segment names a code subsection. */
export function isGuidePurposeSlug(slug: string): boolean {
    return purposeFromSlug(slug) !== undefined;
}

/** The landings prerendered in every locale, as the landing route's params. */
export function landingLocations(): { section?: string; purpose?: string }[] {
    return [
        {},
        ...Purposes.filter(
            (purpose) =>
                purpose !== DefaultPurpose &&
                // The guide never offers these: the project's own concepts (it has no
                // project), borrowed kits' (nothing is borrowed), and the ones not
                // filed under a subsection.
                purpose !== Purpose.Project &&
                purpose !== Purpose.Kit &&
                purpose !== Purpose.Hidden &&
                purpose !== Purpose.How &&
                purpose !== Purpose.GalleryHow,
        ).map((purpose) => ({
            section: SectionSlugs.language,
            purpose: purposeSlug(purpose),
        })),
        { section: SectionSlugs.kits },
        { section: SectionSlugs.howto },
        { section: SectionSlugs.glossary },
    ];
}

/** The segments after `/guide` in a pathname, decoded, with any locale prefix ignored. */
export function guideSegments(pathname: string): string[] {
    const segments = pathname.split('/');
    const at = segments.indexOf('guide');
    return at === -1
        ? []
        : segments
              .slice(at + 1)
              .filter((segment) => segment.length > 0)
              .map((segment) => {
                  try {
                      return decodeURIComponent(segment);
                  } catch {
                      return segment;
                  }
              });
}
