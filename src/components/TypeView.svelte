<script lang="ts">
    import type StructureConcept from '../concepts/StructureConcept';
    import RootView from '../editor/RootView.svelte';
    import { getPalettePath } from '../editor/util/Contexts';
    import { OR_SYMBOL, TYPE_SYMBOL } from '../parser/Symbols';

    export let types: StructureConcept[];

    let path = getPalettePath();

    function navigate(type: StructureConcept) {
        path.set([...$path, type]);
    }
</script>

<span class="dot">{TYPE_SYMBOL}</span>&nbsp;<span>
    {#each types as type, index}
        {#if index > 0}<span class="dot">&nbsp;{OR_SYMBOL}&nbsp;</span>{/if}
        <span
            class="type"
            tabIndex="0"
            on:click={() => navigate(type)}
            on:keydown={(event) =>
                event.key === 'Enter' || event.key === ' '
                    ? navigate(type)
                    : undefined}><RootView node={type.type} inert /></span
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
