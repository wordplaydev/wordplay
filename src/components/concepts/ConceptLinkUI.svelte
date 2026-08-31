<script lang="ts">
    import Link from '@components/app/Link.svelte';
    import {
        canFocusTips,
        canHoverTips,
    } from '@components/widgets/tipTriggers';
    import TutorialHighlight from '@components/app/TutorialHighlight.svelte';
    import CharacterView from '@components/output/CharacterView.svelte';
    import {
        getConceptIndex,
        getConceptPathOptional,
        getTip,
        getUser,
    } from '@components/project/Contexts';
    import Concept from '@concepts/Concept';
    import {
        currentConcept,
        pushConcept,
    } from '@components/concepts/GuideHistory';
    import GalleryHowConcept from '@concepts/GalleryHowConcept';
    import { locales } from '@db/Database';
    import ConceptRef from '@locale/ConceptRef';
    import { getConceptNameById } from '@locale/getConceptName';
    import type TermRef from '@locale/TermRef';
    import ConceptLink, {
        CharacterName,
        CodepointName,
        ConceptName,
        getTermRef,
        GlossaryName,
        HowToName,
        TourName,
        UIName,
    } from '@nodes/ConceptLink';
    import { withMonoEmoji } from '@unicode/emoji';
    import MarkupHTMLView from './MarkupHTMLView.svelte';
    import TourLink from './TourLink.svelte';
    import TermView from './TermView.svelte';

    interface Props {
        link: ConceptRef | ConceptLink | Concept | string;
        label?: string | undefined;
        symbolic?: boolean;
    }

    let { link, label = undefined, symbolic = true }: Props = $props();

    // Resolve the concept
    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);

    // Optional: concept links can render outside a guide (e.g. inside a Hint
    // tooltip or a standalone page), where there's no navigation path.
    let path = getConceptPathOptional();

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
        // A reference to one of the interface tours
        | TourName
        // A reference to a how to
        | HowToName
        // A custom character name
        | CharacterName
        // A concept name (with optional subconcept property) that we couldn't
        // resolve to a Concept — e.g. on pages without a concept index, like
        // /updates. We render a guide link for it, preserving the property.
        | ConceptName
        // A concept name that we couldn't resolve to a Concept. We'll make a link for it.
        | string
        | undefined;

    // A `@term` glossary reference renders as an interactive glossary term, the
    // same as a resolved `@term` reference (see SegmentHTMLView's TermRef branch).
    let term: TermRef | undefined = $derived.by(() => {
        const name =
            link instanceof ConceptLink
                ? link.getName()
                : link instanceof ConceptRef
                  ? link.concept
                  : typeof link === 'string'
                    ? link
                    : undefined;
        if (name === undefined) return undefined;
        const parsed = ConceptLink.parse(name, $locales.getGlossaryForms());
        return parsed instanceof GlossaryName
            ? getTermRef($locales, parsed)
            : undefined;
    });

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
                $locales.getGlossaryForms(),
            );

            if (id === undefined) return undefined;
            // Glossary terms are rendered separately (see `term` below).
            if (id instanceof GlossaryName) return undefined;
            if (
                id instanceof UIName ||
                id instanceof TourName ||
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
            } else if (id instanceof ConceptName)
                // No index at all (e.g. /updates): render a guide link, keeping
                // the subconcept property so `@Color.random` links to the
                // member rather than degrading to `@Color`.
                return id;

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

    /** True when this link points to the concept currently being viewed. Such a link
     *  is rendered inactive (grey thick underline) — it's the only revisitation case
     *  we account for: clicking it does nothing. */
    let isCurrent = $derived(
        concept !== undefined &&
            path !== undefined &&
            currentConcept($path ?? [])?.isEqualTo(concept) === true,
    );

    /** True when this subconcept's owner is the concept currently being viewed,
     *  so the owner prefix (e.g. `Expression.`) is redundant with the page and we
     *  render only the subconcept's own name. */
    let ownerIsCurrent = $derived(
        ownerConcept !== undefined &&
            path !== undefined &&
            currentConcept($path ?? [])?.isEqualTo(ownerConcept) === true,
    );

    function navigate() {
        // Inactive (already-here) links do nothing; otherwise push the concept onto
        // the navigation history as a new location.
        if (isCurrent) return;
        hideTip();
        if (match && typeof match !== 'string' && 'concept' in match && path)
            path.set(pushConcept($path ?? [], match.concept));
    }

    // The shared tooltip surface (set in the root layout). Hover/focus on a
    // resolved concept link previews the concept: the first paragraph of its
    // doc in the preferred locale only, since doc paragraphs are long-form.
    const hint = getTip();
    let view: HTMLElement | undefined = $state(undefined);

    function showTip() {
        // No preview for the concept currently being viewed — its doc is the page.
        if (view === undefined || concept === undefined || isCurrent) return;
        const paragraph = concept.getDocs($locales)[0]?.asFirstParagraph();
        if (paragraph === undefined || paragraph.toText().trim().length === 0)
            return;
        hint.showMarkup(
            [
                {
                    language: $locales.getLocale().language,
                    direction: $locales.getDirection(),
                    markup: paragraph,
                },
            ],
            view,
        );
    }

    function hideTip() {
        hint.hide();
    }

    /**
     * The name for a concept there is no index to resolve — in practice the
     * landing page, which may not build one (it needs a `Project` and a `Basis`
     * that `importGraph.test.ts` forbids page-wide chrome from reaching), so
     * every `@Volume` there read "Volume" in all 29 translated locales. The
     * chain is walked here rather than through `Locales.get`, which is private,
     * but the rule is its: the first locale that wrote a name wins, id last.
     * No symbolic subscript — this is prose, not the guide's reference surface.
     */
    function unindexedName(name: ConceptName): string {
        for (const locale of $locales.getLocales()) {
            const localized = getConceptNameById(
                locale,
                name.name,
                name.property,
            );
            if (localized !== undefined) return localized;
        }
        return name.property ? `${name.name}.${name.property}` : name.name;
    }
</script>

{#if term}<TermView {term} />
{:else if concept}<!-- No whitespace between the bookmark and the button: a
    newline here is a text node, and it renders as a space in front of every
    link, bookmarked or not. In prose HTML collapses it, but the editor renders
    code with `white-space: pre`, where it shows as `for a  @Phrase`. The space
    the bookmark needs lives inside its own branch. -->{#if isConceptGalleryHow && (concept as GalleryHowConcept).howTo.hasBookmarker($user?.uid ?? '')}<MarkupHTMLView
            inline
            markup={'🔖'}
        />{' '}{/if}<button
        type="button"
        class="conceptlink"
        class:interactive={!isCurrent}
        class:inactive={isCurrent}
        aria-disabled={isCurrent}
        bind:this={view}
        onpointerenter={() => (canHoverTips() ? showTip() : undefined)}
        onpointerleave={hideTip}
        onfocus={(event) =>
            canFocusTips(event.currentTarget) ? showTip() : undefined}
        onblur={hideTip}
        onclick={navigate}
        >{#if label}{withMonoEmoji(
                label,
            )}{:else}{#if ownerConcept && !ownerIsCurrent}<span class="long"
                    >{ownerConcept.getName($locales, false)}</span
                >.{/if}<span class="long">{longName}</span
            >{#if symbolicName.toLocaleLowerCase($locales.getLocaleString()) !== longName.toLocaleLowerCase($locales.getLocaleString())}<sub
                    >{withMonoEmoji(symbolicName)}</sub
                >{/if}{/if}</button
    >
{:else if match}
    {#if match instanceof UIName}
        <TutorialHighlight id={match.id} source />
    {:else if match instanceof TourName}
        <TourLink id={match.id} />
    {:else if match instanceof CodepointName}
        {match.codepoint}
    {:else if match instanceof CharacterName}
        <CharacterView name={match} />
    {:else if match instanceof ConceptName}
        <!-- No index to resolve the concept (e.g. the landing page). The label comes
     from locale text (see `unindexedName`); the URL keeps the English id, which
     is what the guide resolves, encoding a subconcept as `Owner/member`. -->
        <Link
            to={`/guide?concept=${encodeURIComponent(
                match.property ? `${match.name}/${match.property}` : match.name,
            )}`}>{unindexedName(match)}</Link
        >
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
        color: var(--wordplay-link-color);
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        /* Resting underline is invisible by default; highlight surfaces reveal it
           via --wordplay-link-underline-color (matches the global <a> rule). */
        text-decoration: calc(var(--wordplay-focus-width) / 2) underline
            var(--wordplay-link-underline-color, transparent);
        cursor: pointer;
    }

    .conceptlink.interactive:focus,
    .conceptlink.interactive:hover {
        outline: none;
        text-decoration: underline;
        text-decoration-thickness: var(--wordplay-focus-width);
        text-decoration-color: var(--wordplay-focus-color);
    }

    /* A link to the concept you're already on: greyed, no underline, to signal
       it's inactive. */
    .conceptlink.inactive {
        color: var(--wordplay-inactive-color);
        text-decoration: none;
        cursor: default;
    }
</style>
