<svelte:options immutable={true} />

<script lang="ts">
    import type UnparsableExpression from '@nodes/UnparsableExpression';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import type UnparsableType from '@nodes/UnparsableType';

    export let node: UnparsableExpression | UnparsableType;
</script>

{#if node.unparsables.length > 0}
    <NodeSequenceView nodes={node.unparsables} />
{:else}<span class="empty">&nbsp;</span>{/if}

<style>
    .empty {
        display: inline-block;
        position: relative;
        width: 1em;
        height: 1lh;
        border-bottom: var(--wordplay-focus-width) solid var(--wordplay-error);
    }
</style>
