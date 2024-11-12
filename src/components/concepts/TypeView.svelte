<script lang="ts">
    import type StructureConcept from '@concepts/StructureConcept';
    import RootView from '../project/RootView.svelte';
    import { getConceptIndex, getConceptPath } from '../project/Contexts';
    import { OR_SYMBOL } from '@parser/Symbols';
    import type Type from '@nodes/Type';
    import type Context from '@nodes/Context';
    import type FunctionConcept from '../../concepts/FunctionConcept';
    import { blocks } from '@db/Database';

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

    function navigate(type: StructureConcept | FunctionConcept) {
        path.set([...$path, type]);
    }
</script>

<span>
    {#each types as [type, concept], index}
        {#if index > 0}<span class="dot">&nbsp;{OR_SYMBOL}&nbsp;</span
            >{/if}<span
            role="button"
            class="type"
            tabindex="0"
            onclick={() => (concept ? navigate(concept) : undefined)}
            onkeydown={(event) =>
                concept && (event.key === 'Enter' || event.key === ' ')
                    ? navigate(concept)
                    : undefined}
            ><RootView
                node={type}
                inert
                inline
                localized="symbolic"
                blocks={$blocks}
            /></span
        >{/each}
</span>

<style>
    .dot {
        color: var(--wordplay-relation-color);
    }

    .type {
        cursor: pointer;
        white-space: nowrap;
    }

    .type:hover {
        border-bottom: var(--wordplay-focus-width) solid
            var(--wordplay-highlight-color);
    }
</style>
