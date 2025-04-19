<script lang="ts">
    import CharacterView from '@components/output/CharacterView.svelte';
    import Concept from '@concepts/Concept';
    import ConceptLink, {
        CharacterName,
        CodepointName,
        HowToName,
        UIName,
    } from '@nodes/ConceptLink';
    import { locales } from '../../db/Database';
    import ConceptRef from '../../locale/ConceptRef';
    import { withMonoEmoji } from '../../unicode/emoji';
    import TutorialHighlight from '../app/TutorialHighlight.svelte';
    import { getConceptIndex, getConceptPath } from '../project/Contexts';
    import Button from '../widgets/Button.svelte';

    interface Props {
        link: ConceptRef | ConceptLink | Concept | string;
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
        // A concept and its optional container.
        | {
              concept: Concept;
              container?: Concept | undefined;
          }
        // A unicode string
        | CodepointName
        // A reference something in the UI
        | UIName
        // A reference to a how to
        | HowToName
        // A custom character name
        | CharacterName
        | undefined;

    // Derive the concept, container, and UI based on the link.
    let match: Match = $derived.by((): Match => {
        // Already have a concept this refers to? Return it.
        if (link instanceof Concept) {
            return {
                concept: link,
                container: index?.getConceptOwner(link),
            };
        }
        // Otherwise, try to resolve the concept.
        else {
            // Parse the link
            const id = ConceptLink.parse(
                link instanceof ConceptLink
                    ? link.getName()
                    : typeof link === 'string'
                      ? link
                      : link.concept,
            );

            if (id === undefined) return undefined;
            if (
                id instanceof UIName ||
                id instanceof CodepointName ||
                id instanceof CharacterName
            )
                return id;

            // Otherwise, try to resolve a concept or subconcept in the index.
            if (index !== undefined) {
                let concept = index.getConceptByName(id?.name);
                if (concept) {
                    // Is it a how to? Return the concept.
                    if (id instanceof HowToName)
                        return {
                            concept,
                        };

                    // No property? Just return the concept.
                    const property = id.property;
                    if (property === undefined) return { concept };

                    // Otherwise, s
                    const subConcept = Array.from(
                        concept.getSubConcepts(),
                    ).find((sub) => sub.hasName(property, $locales));
                    if (subConcept !== undefined)
                        return { container: concept, concept: subConcept };
                    else if (concept.affiliation !== undefined) {
                        const structure = index.getStructureConcept(
                            concept.affiliation,
                        );
                        if (structure) {
                            const subConcept = Array.from(
                                structure.getSubConcepts(),
                            ).find((sub) => sub.hasName(property, $locales));
                            if (subConcept) {
                                return {
                                    container: concept,
                                    concept: subConcept,
                                };
                            }
                        }
                    } else
                        return {
                            concept,
                        };
                }
            }

            return undefined;
        }
    });

    let concept: Concept | undefined = $derived(
        match && 'concept' in match ? match.concept : undefined,
    );

    let longName: string = $derived(concept?.getName($locales, false) ?? '');
    let symbolicName: string = $derived(concept?.getName($locales, true) ?? '');

    function navigate() {
        // If we have a concept and the last concept isn't it, navigate
        if (match) {
            if ('concept' in match) {
                const concept = match.concept;
                if (path) {
                    // Already at this concept? Make a new path anyway to ensure that tile is shown if collapsed.
                    const alreadyHere = $path.at(-1) === concept;
                    if (alreadyHere)
                        path.set([
                            ...$path.slice(0, $path.length - 1),
                            concept,
                        ]);
                    // If the concept before the last is the concept, just go back
                    else if (
                        $path.length >= 2 &&
                        $path[$path.length - 2] === concept
                    )
                        path.set($path.slice(0, $path.length - 1));
                    // Otherwise, append the concept.
                    else path.set([...$path, concept]);
                }
            }
        }
    }
</script>

{#if concept}
    <Button
        padding={false}
        action={navigate}
        wrap={true}
        tip={() =>
            $locales.concretize((l) => l.ui.docs.link, longName).toText()}
        ><span class="conceptlink interactive"
            >{#if label}{withMonoEmoji(label)}{:else}<span class="long"
                    >{longName}</span
                >{#if symbolicName !== longName && symbolic}<sub
                        >{withMonoEmoji(symbolicName)}</sub
                    >{/if}{/if}</span
        ></Button
    >
{:else if match}
    {#if match instanceof UIName}
        <TutorialHighlight id={match.id} source />
    {:else if match instanceof CodepointName}
        {match.codepoint}
    {:else if match instanceof CharacterName}
        <CharacterView name={match} />
    {/if}
{:else if link instanceof ConceptLink}
    {link.concept.getText()}
{:else if link instanceof ConceptRef}
    {link.concept}
{:else if typeof link === 'string'}
    {link}
{:else}
    {link.getName($locales, true)}
{/if}

<style>
    .conceptlink {
        display: inline-block;
        font-style: normal;
        text-align: start;
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
