<script lang="ts">
    import Link from '@components/app/Link.svelte';
    import TutorialHighlight from '@components/app/TutorialHighlight.svelte';
    import CharacterView from '@components/output/CharacterView.svelte';
    import {
        getConceptIndex,
        getConceptPath,
        getUser,
    } from '@components/project/Contexts';
    import Concept from '@concepts/Concept';
    import GalleryHowConcept from '@concepts/GalleryHowConcept';
    import { locales } from '@db/Database';
    import ConceptRef from '@locale/ConceptRef';
    import ConceptLink, {
        CharacterName,
        CodepointName,
        ConceptName,
        HowToName,
        UIName,
    } from '@nodes/ConceptLink';
    import { withMonoEmoji } from '@unicode/emoji';
    import MarkupHTMLView from './MarkupHTMLView.svelte';

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
        // A concept name that we couldn't resolve to a Concept. We'll make a link for it.
        | string
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

                    // Otherwise, resolve the named subconcept on the concept itself.
                    const subConcept = index.getSubConceptByName(
                        concept,
                        property,
                    );
                    if (subConcept !== undefined)
                        return { container: concept, concept: subConcept };
                    else if (concept.affiliation !== undefined) {
                        const structure = index.getStructureConcept(
                            concept.affiliation,
                        );
                        if (structure) {
                            const subConcept = index.getSubConceptByName(
                                structure,
                                property,
                            );
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
            } else if (id instanceof ConceptName) return id.name;

            return undefined;
        }
    });

    let concept: Concept | undefined = $derived(
        match && typeof match !== 'string' && 'concept' in match
            ? match.concept
            : undefined,
    );

    let ownerConcept: Concept | undefined = $derived(
        match && typeof match !== 'string' && 'container' in match
            ? match.container
            : undefined,
    );

    let isConceptGalleryHow: boolean = $derived(
        concept instanceof GalleryHowConcept,
    );

    let user = getUser();

    let longName: string = $derived(concept?.getName($locales, false) ?? '');
    let symbolicName: string = $derived(concept?.getName($locales, true) ?? '');

    function navigate() {
        // If we have a concept and the last concept isn't it, navigate
        if (match) {
            if (typeof match !== 'string' && 'concept' in match) {
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
    {#if isConceptGalleryHow && (concept as GalleryHowConcept).howTo.hasBookmarker($user?.uid ?? '')}
        <MarkupHTMLView inline markup={'🔖'} />
    {/if}
    <button
        type="button"
        class="conceptlink interactive"
        title={$locales
            .concretize((l) => l.ui.docs.link, { name: longName })
            .toText()}
        onclick={navigate}
        >{#if label}{withMonoEmoji(label)}{:else}{#if ownerConcept}<span
                    class="long">{ownerConcept.getName($locales, false)}</span
                >.{/if}<span class="long">{longName}</span
            >{#if symbolicName.toLocaleLowerCase($locales.getLocaleString()) !== longName.toLocaleLowerCase($locales.getLocaleString())}<sub
                    >{withMonoEmoji(symbolicName)}</sub
                >{/if}{/if}</button
    >
{:else if match}
    {#if match instanceof UIName}
        <TutorialHighlight id={match.id} source />
    {:else if match instanceof CodepointName}
        {match.codepoint}
    {:else if match instanceof CharacterName}
        <CharacterView name={match} />
    {:else if typeof match === 'string'}
        <Link to={`/guide?concept=${encodeURIComponent(match)}`}>{match}</Link>
    {/if}
{:else if link instanceof ConceptLink}
    {link.concept.getText()}
{:else if link instanceof ConceptRef}
    {link.concept}
{:else if typeof link === 'string'}
    {link}
{:else}
    {link.getName($locales, symbolic)}
{/if}

<style>
    /* Render concept links exactly like a plain text <Link> (a bare <a>):
       no button chrome, highlight-colored, underline only on hover/focus. */
    .conceptlink {
        display: inline;
        font: inherit;
        text-align: start;
        color: var(--wordplay-highlight-color);
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        text-decoration: none;
        cursor: pointer;
    }

    .conceptlink.interactive:focus,
    .conceptlink.interactive:hover {
        outline: none;
        text-decoration: underline;
        text-decoration-thickness: var(--wordplay-focus-width);
        text-decoration-color: var(--wordplay-focus-color);
    }
</style>
