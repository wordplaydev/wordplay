<script lang="ts">
    import { getConceptIndex, getConceptPath } from '../project/Contexts';
    import ConceptLink from '@nodes/ConceptLink';
    import Concept from '@concepts/Concept';
    import { locales } from '../../db/Database';
    import TutorialHighlight from '../app/TutorialHighlight.svelte';
    import ConceptRef from '../../locale/ConceptRef';
    import Button from '../widgets/Button.svelte';
    import { withMonoEmoji } from '../../unicode/emoji';
    import { goto } from '$app/navigation';
    import CharacterView from '@components/output/CharacterView.svelte';

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

    /** The different types of matches we can find */
    type Match =
        | {
              concept: Concept;
              container?: Concept | undefined;
          }
        | { unicode: string }
        | { ui: string }
        | { character: string }
        | undefined;

    // Derive the concept, container, and UI based on the link.
    let match: Match = $derived.by((): Match => {
        if (link instanceof Concept) {
            return {
                concept: link,
                container: index?.getConceptOwner(link),
            };
        }
        // Otherwise, try to resolve the concept.
        else {
            // Remove the link symbol
            const id =
                link instanceof ConceptLink ? link.getName() : link.concept;
            console.log("Couldn't find " + id);
            // Split the name by /
            const names = id.split('/');
            // See if it's a UI reference
            if (names[0] === 'UI' && names.length > 1) {
                return {
                    ui: names[1],
                };
            }
            // See if the concept is a hex string
            const codepoint =
                link instanceof ConceptLink ? link.getCodepoint() : undefined;
            if (codepoint) {
                return {
                    unicode: codepoint,
                };
            }
            // Otherwise, try to resolve a concept or subconcept in the index.
            else if (index !== undefined) {
                let concept = index.getConceptByName(names[0]);
                if (concept) {
                    if (names.length > 1) {
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
                                ).find((sub) =>
                                    sub.hasName(names[1], $locales),
                                );
                                if (subConcept) {
                                    return {
                                        container: concept,
                                        concept: subConcept,
                                    };
                                }
                            }
                        }
                    } else
                        return {
                            concept,
                        };
                }
            }

            return { character: id };
        }
    });

    let concept: Concept | undefined = $derived(
        match && 'concept' in match ? match.concept : undefined,
    );

    let longName: string = $derived(concept?.getName($locales, false) ?? '');
    let symbolicName: string = $derived(concept?.getName($locales, true) ?? '');

    function navigate() {
        // If we have a concept and the last concept isn't it, navigate
        if (match && 'concept' in match) {
            const concept = match.concept;
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

{#if concept}
    <Button
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
    >
{:else if match}
    {#if 'ui' in match}
        <TutorialHighlight id={match.ui} source />
    {:else if 'unicode' in match}
        {match.unicode}
    {:else if 'character' in match}
        <CharacterView name={match.character} />
    {/if}
{:else if link instanceof ConceptLink}
    {link.concept.getText()}
{:else if link instanceof ConceptRef}
    {link.concept}
{:else}
    {link.getName($locales, true)}
{/if}

{#if concept}
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
{/if}

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
