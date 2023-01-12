<script lang="ts">
    import type StructureConcept from '../concepts/StructureConcept';
    import RootView from '../editor/RootView.svelte';
    import { getPalettePath } from '../editor/util/Contexts';

    export let type: StructureConcept;

    let path = getPalettePath();

    function navigate() {
        path.set([...$path, type]);
    }
</script>

<span class="dot">•</span>&nbsp;<div
    class="type"
    tabIndex="0"
    on:click={navigate}
    on:keydown={(event) =>
        event.key === 'Enter' || event.key === ' ' ? navigate() : undefined}
    ><RootView node={type.type} inert /></div
>

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
