<script lang="ts">
    import type Concept from '@concepts/Concept';
    import { TYPE_CLOSE_SYMBOL, TYPE_OPEN_SYMBOL } from '@parser/Symbols';
    import { slide } from 'svelte/transition';
    import { Locales, animationDuration, blocks, locales } from '@db/Database';
    import type LocaleText from '@locale/LocaleText';
    import type Type from '@nodes/Type';
    import type TypeVariables from '@nodes/TypeVariables';
    import Progress from '../../tutorial/Progress';
    import Link from '@components/app/Link.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import Speech from '@components/lore/Speech.svelte';
    import RootView from '@components/project/RootView.svelte';
    import ConceptPreview from '@components/concepts/ConceptPreview.svelte';
    import ConceptLinkUI from '@components/concepts/ConceptLinkUI.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getConceptIndex } from '@components/project/Contexts';
    import { summarizeUnionTypes } from '@components/concepts/elideNode';

    interface Props {
        concept: Concept;
        type?: Type | undefined;
        header?: boolean;
        variables?: TypeVariables | undefined;
        children?: import('svelte').Snippet;
    }

    let {
        concept,
        type = undefined,
        header = true,
        variables = undefined,
        children,
    }: Props = $props();

    /** The tutorial scene that teaches this concept, if any: its URL and its title (used as the
     *  link label). Found by matching the concept's character name to a scene in the locale's tutorial. */
    let tutorial: { url: string; title: string } | undefined = $state(undefined);

    async function getConceptTutorial(locale: LocaleText) {
        const character = concept.getCharacterName($locales);
        if (character) {
            const tutorial = await Locales.getTutorial(
                locale.language,
                locale.regions,
            );
            if (tutorial) {
                for (const [actIndex, act] of tutorial.acts.entries()) {
                    for (const [sceneIndex, scene] of act.scenes.entries()) {
                        if (scene.concept === character) {
                            return {
                                url: new Progress(
                                    tutorial,
                                    actIndex + 1,
                                    sceneIndex + 1,
                                    0,
                                ).getURL(),
                                title: scene.title,
                            };
                        }
                    }
                }
            }
        }

        return undefined;
    }
    // Summarize long internal unions (e.g. a stream input's font-face union)
    // so the representation reads as a compact summary rather than a wall of
    // type options. Display-only; the concept's representation is unchanged.
    let node = $derived(summarizeUnionTypes(concept.getRepresentation($locales)));

    // When locales or the concept change, retrieve the tutorial scene for this concept.
    $effect(() => {
        getConceptTutorial($locales.getLocale()).then((t) => (tutorial = t));
    });

    // The how-tos relevant to this concept, ranked and capped by the index.
    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);
    let eligibleHowTos = $derived(
        header && index ? index.getHowTosForConcept(concept) : [],
    );

    // Lay the tutorial + how-tos out as an inline-end sidebar only when there are enough items to
    // fill it; with a few, stack them below the docs so there's no awkward empty gap.
    let items = $derived((tutorial ? 1 : 0) + eligibleHowTos.length);
    let useSidebar = $derived(items > 5);
</script>

<div class="concept" transition:slide|local={{ duration: $animationDuration }}>
    {#if header}
        <ConceptPreview {concept} {type} {node} describe={false} />
    {/if}

    <div class="body" class:sidebar={useSidebar}>
        <div class="bubble">
            <Speech character={concept.getCharacter($locales)} below={header}>
                {#snippet content()}
                    {#if concept.getDocs($locales)[0]}
                        <MarkupHTMLView
                            markup={{ perLocale: (l) => concept.getDocs(l)[0] }}
                        />
                    {:else}
                        {$locales.concretize((l) => l.ui.docs.nodoc)}
                    {/if}
                {/snippet}
                {#snippet aside()}
                    {#if variables}
                        <small
                            >{TYPE_OPEN_SYMBOL}{#each variables.variables as variable, index}{#if index > 0},
                                {/if}{@const name =
                                    variable.names.getPreferredName(
                                        $locales.getLocales(),
                                    )}{#if name}<RootView
                                        locale="symbolic"
                                        node={name.withoutLanguage()}
                                        blocks={$blocks}
                                    />{/if}{/each}{TYPE_CLOSE_SYMBOL}</small
                        >{/if}
                {/snippet}
            </Speech>
        </div>

        {#if header && items > 0}
            <aside class="links">
                {#if tutorial}
                    <Subheader text={(l) => l.ui.docs.tutorial} />
                    <Link external to={tutorial.url}>{tutorial.title}</Link>
                {/if}
                {#if eligibleHowTos.length > 0}
                    <Subheader text={(l) => l.ui.docs.how.conceptHowTos} />
                    <ul class="howtos">
                        {#each eligibleHowTos as how (how)}
                            <li><ConceptLinkUI link={how} /></li>
                        {/each}
                    </ul>
                {/if}
            </aside>
        {/if}
    </div>

    {@render children?.()}
</div>

<style>
    .concept {
        display: flex;
        flex-direction: column;
        gap: calc(2 * var(--wordplay-spacing));
    }

    /* With few items, the links stack below the docs. */
    .body {
        display: flex;
        flex-direction: column;
        gap: calc(2 * var(--wordplay-spacing));
    }

    /* With enough items, the links become an inline-end sidebar that wraps below on narrow
       windows; align-items keeps the first link header level with the top of the speech bubble. */
    .body.sidebar {
        flex-direction: row;
        flex-wrap: wrap;
        align-items: flex-start;
    }

    .body.sidebar .bubble {
        flex: 1 1 20em;
        min-inline-size: 0;
    }

    .body.sidebar .links {
        flex: 1 1 12em;
        min-inline-size: 10em;
    }

    .links {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .howtos {
        list-style: none;
        padding-inline-start: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing-half);
    }
</style>
