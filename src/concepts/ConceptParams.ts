/** Reusable functions for getting and setting concepts and search in the page URL */

import type Concept from '@concepts/Concept';
import type ConceptIndex from '@concepts/ConceptIndex';

export const PARAM_CONCEPT = 'concept';
export const PARAM_QUERY = 'query';
/** The guide section (code vs how-to). */
export const PARAM_SECTION = 'section';
/** The code section's concept-type subsection. */
export const PARAM_PURPOSE = 'purpose';
/** The how-to section's filter. */
export const PARAM_HOWTO = 'howto';
/**
 * A kit's page, as its full `username/name` (#8).
 *
 * Its own param rather than a `?concept=` value, because `getConceptFromURL` splits that
 * on `/` into owner and name — so `amy/colors` would be read as the concept `colors`
 * owned by `amy`, which is a different thing entirely and usually nothing.
 */
export const PARAM_KIT = 'kit';
/** Which version of the kit at {@link PARAM_KIT} to show. The latest when absent. */
export const PARAM_KIT_VERSION = 'version';

/** The kit and version a URL names, if it names one. */
export function getKitFromURL(params: URLSearchParams):
    | {
          name: string;
          version: number | undefined;
      }
    | undefined {
    const name = params.get(PARAM_KIT);
    if (name === null || name.length === 0) return undefined;
    const version = Number(params.get(PARAM_KIT_VERSION));
    return {
        name,
        // A missing or nonsense version means the latest, rather than nothing: a link
        // that lost its version should still show the kit.
        version: Number.isInteger(version) && version > 0 ? version : undefined,
    };
}

/** The guide URL that shows one kit, which registry tiles and version lists both link to. */
export function kitURL(name: string, version?: number | undefined): string {
    return `/guide?${PARAM_KIT}=${encodeURIComponent(name)}${
        version === undefined ? '' : `&${PARAM_KIT_VERSION}=${version}`
    }`;
}

/** Type guard for membership in a fixed set of strings (avoids an `as` cast). */
function isMember<T extends string>(
    value: string,
    valid: readonly T[],
): value is T {
    return valid.some((option) => option === value);
}

/**
 * Reads a constrained string param from the URL, returning `fallback` when the
 * param is absent or not one of `valid`. Used for guide view state (section,
 * concept type, how-to filter).
 */
export function getEnumFromURL<T extends string>(
    params: URLSearchParams,
    key: string,
    valid: readonly T[],
    fallback: T,
): T {
    const value = params.get(key);
    return value !== null && isMember(value, valid) ? value : fallback;
}

/** Writes a string param, omitting it when it equals `fallback` to keep URLs clean. */
export function setEnumInURL(
    params: URLSearchParams,
    key: string,
    value: string,
    fallback: string,
) {
    if (value === fallback) params.delete(key);
    else params.set(key, value);
}

/** Reads the guide search query from the URL, or '' when absent. */
export function getQueryFromURL(params: URLSearchParams): string {
    return params.get(PARAM_QUERY) ?? '';
}

/** Writes a non-empty search query to the URL (or removes it when empty). */
export function setQueryInURL(query: string, params: URLSearchParams) {
    const trimmed = query.trim();
    if (trimmed.length > 0) params.set(PARAM_QUERY, trimmed);
    else params.delete(PARAM_QUERY);
}

export function getConceptFromURL(
    index: ConceptIndex,
    params: URLSearchParams,
): Concept | undefined {
    const id = params.get(PARAM_CONCEPT);
    if (id === null) return undefined;

    if (id && index) {
        const [ownerName, name] = id.split('/');
        return ownerName && name
            ? index.getSubConcept(ownerName, name)
            : index.getConceptByToken(ownerName);
    }
    return undefined;
}

export function setConceptInURL(
    concept: Concept | undefined,
    index: ConceptIndex,
    params: URLSearchParams,
) {
    if (concept) {
        // Encode the concept (and its owner, if any) using the same token the
        // index resolves on, so getConceptFromURL can always read it back.
        const name = index.getConceptToken(concept);
        const owner = index.getConceptOwner(concept);
        const ownerName = owner ? index.getConceptToken(owner) : undefined;
        params.set(PARAM_CONCEPT, `${ownerName ? `${ownerName}/` : ''}${name}`);
    } else params.delete(PARAM_CONCEPT);
}
