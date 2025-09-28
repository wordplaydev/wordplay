<script lang="ts">
    import type UnparsableExpression from '@nodes/UnparsableExpression';
    import type UnparsableType from '@nodes/UnparsableType';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import { type Format } from './NodeView.svelte';

    interface Props {
        node: UnparsableExpression | UnparsableType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if node.unparsables.length > 0}
    <NodeSequenceView {node} field="unparsables" {format} />
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
