<script lang="ts">
    import { getConceptIndex, getConceptPath } from '../project/Contexts';
    import ConceptLink from '@nodes/ConceptLink';
    import Concept from '@concepts/Concept';
    import { creator } from '../../db/Creator';
    import TutorialHighlight from '../app/TutorialHighlight.svelte';
    import type ConceptRef from '../../locale/ConceptRef';

    export let link: ConceptRef | ConceptLink | Concept;
    export let salient: boolean = true;
    export let label: string | undefined = undefined;

    // Resolve the concept
    let index = getConceptIndex();
    let path = getConceptPath();

    let concept: Concept | undefined;
    let ui: string | undefined;
    $: {
        if (link instanceof Concept) concept = link;
        else if ($index === undefined) concept = undefined;
        // Try to resolve the concept in the index
        else {
            // Remove the link symbol
            const id =
                link instanceof ConceptLink
                    ? link.concept.getText().slice(1)
                    : link.concept;
            // Split the name by /
            const names = id.split('/');
            // See if it's a UI reference
            if (names[0] === 'UI' && names.length > 1) {
                ui = names[1];
            }
            // Otherwise, try to resolve a concept or subconcept.
            else {
                concept = $index.getConceptByName(names[0]);
                if (concept && names.length > 1) {
                    const subConcept = Array.from(
                        concept.getSubConcepts()
                    ).find((sub) =>
                        sub.hasName(names[1], $creator.getLocale())
                    );
                    if (subConcept !== undefined) concept = subConcept;
                    else if (concept.affiliation !== undefined) {
                        const structure = $index.getStructureConcept(
                            concept.affiliation
                        );
                        if (structure) {
                            const subConcept = Array.from(
                                structure.getSubConcepts()
                            ).find((sub) =>
                                sub.hasName(names[1], $creator.getLocale())
                            );
                            if (subConcept) concept = subConcept;
                        }
                    }
                }
            }
        }
    }

    let longName: string;
    let symbolicName: string;
    $: {
        if (concept) {
            symbolicName = concept.getName($creator.getLocale(), true);
            longName = concept.getName($creator.getLocale(), false);
        }
    }

    function navigate() {
        // If we have a concept and the last concept isn't it, navigate
        if (concept && $path[$path.length - 1] !== concept) {
            // If the concept before the last is the concept, just go back
            if ($path.length >= 2 && $path[$path.length - 2] === concept)
                path.set($path.slice(0, $path.length - 1));
            // Otherwise, append the concept.
            else path.set([...$path, concept]);
        }
    }
</script>

{#if concept}
    <span
        role="button"
        class="interactive"
        class:salient
        tabindex="0"
        on:pointerdown={navigate}
        on:keydown={(event) =>
            event.key == ' ' || event.key === 'Enter' ? navigate() : undefined}
        >{#if label}{label}{:else}{longName}{#if symbolicName !== longName}<sub
                    >{symbolicName}</sub
                >{/if}{/if}
    </span>
{:else if ui}
    <TutorialHighlight />
{:else if link instanceof ConceptLink}
    <span>{link.concept.getText()}</span>
{/if}

<style>
    span {
        display: inline-block;
    }

    .salient {
        font-weight: bold;
    }

    span.interactive {
        text-shadow: 1px 1px 2px var(--wordplay-highlight);
    }

    span.interactive:hover {
        color: var(--wordplay-highlight);
        cursor: pointer;
    }
</style>
