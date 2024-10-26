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
        width: 1px;
        height: 1lh;
        outline: var(--wordplay-focus-width) solid var(--wordplay-error);
        border-radius: var(--wordplay-border-radius);
    }
</style>
