<svelte:options immutable={true} />

<script lang="ts">
    import type ExpressionPlaceholder from '../nodes/ExpressionPlaceholder';
    import NodeView from './NodeView.svelte';

    export let node: ExpressionPlaceholder;
</script>

<!-- We have to show all the tokens to make caret navigation work, so we just hide the unnecessary ones. -->
<span class="placeholder"
    ><span class={node.dot && node.type ? 'hidden' : ''}
        ><NodeView node={node.placeholder} /><NodeView node={node.dot} /></span
    ><NodeView node={node.type} /></span
>

<style>
    .placeholder :global(.text) {
        color: var(--wordplay-disabled-color);
        font-style: italic;
    }

    .hidden :global(.text) {
        display: inline-block;
        width: 0;
        opacity: 0;
    }
</style>
