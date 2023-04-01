<svelte:options immutable={true} />

<script lang="ts">
    import type ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import NodeView from './NodeView.svelte';

    export let node: ExpressionPlaceholder;
</script>

<span class="placeholder"
    ><span class={node.dot && node.type ? 'hidden' : ''}
        ><NodeView node={node.placeholder} /><NodeView node={node.dot} /></span
    ><NodeView node={node.type} /></span
>

<style>
    .placeholder :global(.token-view) {
        color: var(--wordplay-disabled-color);
        font-style: italic;
    }

    /* Decided not to hide type. */
    /* .hidden :global(.token-view) {
        display: inline-block;
        width: 0;
        opacity: 0;
    } */
</style>
