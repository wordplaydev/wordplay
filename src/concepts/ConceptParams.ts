/** Reusable functions for getting and setting concepts in the page URL */

import type Locales from '@locale/Locales';
import type Concept from './Concept';
import type ConceptIndex from './ConceptIndex';

export const PARAM_CONCEPT = 'concept';

export function getConceptFromURL(
    index: ConceptIndex,
    params: URLSearchParams,
): Concept | undefined {
    const id = params.get(PARAM_CONCEPT);
    if (id === null) return undefined;

    if (id && index) {
        const [ownerName, name] = id.split('/');
        const concept =
            ownerName && name
                ? index.getSubConcept(ownerName, name)
                : index.getConceptByCharacterName(ownerName);
        return concept;
    }
    return undefined;
}

export function setConceptInURL(
    locales: Locales,
    concept: Concept | undefined,
    index: ConceptIndex,
    params: URLSearchParams,
) {
    if (concept) {
        const name = concept.getCharacterName(locales);
        const ownerName = index
            ?.getConceptOwner(concept)
            ?.getName(locales, false);

        params.set(PARAM_CONCEPT, `${ownerName ? `${ownerName}/` : ''}${name}`);
    } else params.delete(PARAM_CONCEPT);
}
