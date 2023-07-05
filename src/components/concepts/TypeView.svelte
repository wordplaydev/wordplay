<script lang="ts">
    import type StructureConcept from '@concepts/StructureConcept';
    import RootView from '../project/RootView.svelte';
    import { getConceptPath } from '../project/Contexts';
    import { OR_SYMBOL } from '@parser/Symbols';

    export let types: StructureConcept[];

    let path = getConceptPath();

    function navigate(type: StructureConcept) {
        path.set([...$path, type]);
    }
</script>

<span>
    {#each types as type, index}
        {#if index > 0}<span class="dot">&nbsp;{OR_SYMBOL}&nbsp;</span
            >{/if}<span
            role="button"
            class="type"
            tabindex="0"
            on:pointerdown={() => navigate(type)}
            on:keydown={(event) =>
                event.key === 'Enter' || event.key === ' '
                    ? navigate(type)
                    : undefined}
            ><RootView node={type.type} inert inline /></span
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
            var(--wordplay-highlight);
    }
</style>
