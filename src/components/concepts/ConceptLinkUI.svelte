<script lang="ts">
    import { getConceptIndex, getConceptPath } from '../project/Contexts';
    import ConceptLink from '@nodes/ConceptLink';
    import Concept from '@concepts/Concept';
    import { locales } from '../../db/Database';
    import TutorialHighlight from '../app/TutorialHighlight.svelte';
    import type ConceptRef from '../../locale/ConceptRef';
    import Button from '../widgets/Button.svelte';
    import { withMonoEmoji } from '../../unicode/emoji';
    import { goto } from '$app/navigation';

    interface Props {
        link: ConceptRef | ConceptLink | Concept;
        label?: string | undefined;
        symbolic?: boolean;
    }

    let { link, label = undefined, symbolic = true }: Props = $props();

    // Resolve the concept
    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);

    let path = getConceptPath();

    type Match = {
        concept: Concept | undefined;
        container?: Concept | undefined;
        ui?: string | undefined;
    };

    // Derive the concept, container, and UI based on the link.
    let { concept, container, ui }: Match = $derived.by((): Match => {
        if (link instanceof Concept) {
            return {
                concept: link,
                container: index?.getConceptOwner(link),
            };
        } else if (index === undefined)
            return { concept: undefined, container: undefined };
        // Try to resolve the concept in the index
        else {
            // Remove the link symbol
            const id =
                link instanceof ConceptLink ? link.getName() : link.concept;
            // Split the name by /
            const names = id.split('/');
            // See if it's a UI reference
            if (names[0] === 'UI' && names.length > 1) {
                return {
                    concept: undefined,
                    container: undefined,
                    ui: names[1],
                };
            }
            // Otherwise, try to resolve a concept or subconcept.
            else {
                let concept = index.getConceptByName(names[0]);
                if (concept && names.length > 1) {
                    const subConcept = Array.from(
                        concept.getSubConcepts(),
                    ).find((sub) => sub.hasName(names[1], $locales));
                    if (subConcept !== undefined)
                        return { container: concept, concept: subConcept };
                    else if (concept.affiliation !== undefined) {
                        const structure = index.getStructureConcept(
                            concept.affiliation,
                        );
                        if (structure) {
                            const subConcept = Array.from(
                                structure.getSubConcepts(),
                            ).find((sub) => sub.hasName(names[1], $locales));
                            if (subConcept) {
                                return {
                                    container: concept,
                                    concept: subConcept,
                                };
                            }
                        }
                    }
                } else return { concept, container: undefined };
            }
            return { concept: undefined, container: undefined };
        }
    });

    let longName: string = $derived(
        concept ? concept.getName($locales, false) : '',
    );
    let symbolicName: string = $derived(
        concept ? concept.getName($locales, true) : '',
    );

    function navigate() {
        // If we have a concept and the last concept isn't it, navigate
        if (concept) {
            if (path) {
                // Already at this concept? Make a new path anyway to ensure that tile is shown if collapsed.
                const alreadyHere = $path.at(-1) === concept;
                if (alreadyHere)
                    path.set([...$path.slice(0, $path.length - 1), concept]);
                // If the concept before the last is the concept, just go back
                else if (
                    $path.length >= 2 &&
                    $path[$path.length - 2] === concept
                )
                    path.set($path.slice(0, $path.length - 1));
                // Otherwise, append the concept.
                else path.set([...$path, concept]);
            } else {
                goto('/guide');
            }
        }
    }
</script>

{#if concept}<Button
        padding={false}
        action={navigate}
        tip={$locales.concretize((l) => l.ui.docs.link, longName).toText()}
        ><span class="conceptlink interactive"
            >{#if label}{withMonoEmoji(label)}{:else}<span class="long"
                    >{longName}</span
                >{#if symbolicName !== longName && symbolic}<sub
                        >{withMonoEmoji(symbolicName)}</sub
                    >{/if}{/if}</span
        ></Button
    >{:else if ui}
    <TutorialHighlight
        id={ui}
        source
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
