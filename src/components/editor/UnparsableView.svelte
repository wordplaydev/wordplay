<script lang="ts">
    import type UnparsableExpression from '@nodes/UnparsableExpression';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import type UnparsableType from '@nodes/UnparsableType';

    interface Props {
        node: UnparsableExpression | UnparsableType;
    }

    let { node }: Props = $props();
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
