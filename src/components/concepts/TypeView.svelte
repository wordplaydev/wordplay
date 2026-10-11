<script lang="ts">
    import type StructureConcept from '#concepts/StructureConcept.ts';
    import { blocks } from '#db/Database.ts';
    import type Context from '#nodes/Context.ts';
    import type Type from '#nodes/Type.ts';
    import { OR_SYMBOL } from '#parser/Symbols.ts';
    import type FunctionConcept from '#concepts/FunctionConcept.ts';
    import {
        getConceptIndex,
        getConceptPath,
    } from '#components/project/Contexts.ts';
    import {
        guideConceptURL,
        pushConcept,
    } from '#components/concepts/GuideHistory.ts';
    import { page } from '$app/state';
    import RootView from '#components/project/RootView.svelte';

    interface Props {
        type: Type;
        context: Context;
    }

    let { type, context }: Props = $props();

    let path = getConceptPath();

    let indexContext = getConceptIndex();
    let index = $derived(indexContext?.index);

    let types = $derived(
        type
            .getTypeSet(context)
            .list()
            .map((type) => [type, index?.getConceptOfType(type)] as const),
    );

    /** A plain click navigates in place; a modified or middle click is left to the
     *  browser, which follows the href to the same concept in the guide. */
    function follow(
        event: MouseEvent,
        type: StructureConcept | FunctionConcept,
    ) {
        if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        )
            return;
        event.preventDefault();
        path.set(pushConcept($path, type));
    }
</script>

<span>
    {#each types as [type, concept], position}
        {#if position > 0}<span class="dot">&nbsp;{OR_SYMBOL}&nbsp;</span
            >{/if}{#if concept && index}<a
                class="type"
                href={`${page.params.locale ? `/${page.params.locale}` : ''}${guideConceptURL(concept, index)}`}
                onclick={(event) => follow(event, concept)}
                ><RootView
                    node={type}
                    inert
                    inline
                    locale="symbolic"
                    blocks={$blocks}
                /></a
            >{:else}<span class="type"
                ><RootView
                    node={type}
                    inert
                    inline
                    locale="symbolic"
                    blocks={$blocks}
                /></span
            >{/if} >{/each}
</span>

<style>
    .dot {
        color: var(--wordplay-relation-color);
    }

    .type {
        white-space: nowrap;
        color: inherit;
        text-decoration: none;
    }

    a.type:hover {
        border-bottom: var(--wordplay-focus-width) solid
            var(--wordplay-highlight-color);
    }
</style>
