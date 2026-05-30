/** Reusable functions for getting and setting concepts in the page URL */

import type Concept from '@concepts/Concept';
import type ConceptIndex from '@concepts/ConceptIndex';

export const PARAM_CONCEPT = 'concept';

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
