<script lang="ts">
    import { getConceptIndex, getConceptPath } from '../project/Contexts';
    import ConceptLink from '@nodes/ConceptLink';
    import Concept from '@concepts/Concept';
    import { locales } from '../../db/Database';
    import TutorialHighlight from '../app/TutorialHighlight.svelte';
    import type ConceptRef from '../../locale/ConceptRef';
    import Button from '../widgets/Button.svelte';
    import concretize from '../../locale/concretize';
    import { withVariationSelector } from '../../unicode/emoji';

    export let link: ConceptRef | ConceptLink | Concept;
    export let label: string | undefined = undefined;
    export let symbolic = true;

    // Resolve the concept
    let index = getConceptIndex();
    let path = getConceptPath();

    let concept: Concept | undefined;
    let container: Concept | undefined;
    let ui: string | undefined;
    $: {
        if (link instanceof Concept) {
            concept = link;
            container = $index?.getConceptOwner(concept);
        } else if ($index === undefined) concept = undefined;
        // Try to resolve the concept in the index
        else {
            // Remove the link symbol
            const id =
                link instanceof ConceptLink ? link.getName() : link.concept;
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
                        concept.getSubConcepts(),
                    ).find((sub) => sub.hasName(names[1], $locales));
                    if (subConcept !== undefined) concept = subConcept;
                    else if (concept.affiliation !== undefined) {
                        const structure = $index.getStructureConcept(
                            concept.affiliation,
                        );
                        if (structure) {
                            const subConcept = Array.from(
                                structure.getSubConcepts(),
                            ).find((sub) => sub.hasName(names[1], $locales));
                            if (subConcept) {
                                container = concept;
                                concept = subConcept;
                            }
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
            symbolicName = concept.getName($locales, true);
            longName = concept.getName($locales, false);
        }
    }

    function navigate() {
        // If we have a concept and the last concept isn't it, navigate
        if (concept) {
            // Already at this concept? Make a new path anyway to ensure that tile is shown if collapsed.
            const alreadyHere = $path.at(-1) === concept;
            if (alreadyHere)
                path.set([...$path.slice(0, $path.length - 1), concept]);
            // If the concept before the last is the concept, just go back
            else if ($path.length >= 2 && $path[$path.length - 2] === concept)
                path.set($path.slice(0, $path.length - 1));
            // Otherwise, append the concept.
            else path.set([...$path, concept]);
        }
    }
</script>

{#if concept}<Button
        action={navigate}
        tip={concretize(
            $locales,
            $locales.get((l) => l.ui.docs.link),
            longName,
        ).toText()}
        ><span class="conceptlink interactive"
            >{#if label}{withVariationSelector(label)}{:else}<span class="long"
                    >{longName}</span
                >{#if symbolicName !== longName && symbolic}<sub
                        >{withVariationSelector(symbolicName)}</sub
                    >{/if}{/if}</span
        ></Button
    >{:else if ui}<TutorialHighlight
    />{:else if link instanceof ConceptLink}<span
        >{#if container}{container.getName(
                $locales,
                false,
            )}{/if}{link.concept.getText()}</span
    >{/if}

<style>
    .conceptlink {
        display: inline-block;
        font-style: normal;
    }

    .conceptlink.interactive {
        text-decoration: underline;
        text-decoration-color: var(--wordplay-highlight-color);
        text-decoration-thickness: var(--wordplay-border-width);
    }

    :global(button):focus .conceptlink,
    .conceptlink.interactive:hover {
        cursor: pointer;
        text-decoration-thickness: var(--wordplay-focus-width);
    }

    :global(button):focus .conceptlink {
        background: var(--wordplay-focus-color);
        color: var(--wordplay-background);
        border-radius: var(--wordplay-border-radius);
    }
</style>
