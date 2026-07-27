<script lang="ts">
    import type UnparsableExpression from '@nodes/UnparsableExpression';
    import type UnparsableType from '@nodes/UnparsableType';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: UnparsableExpression | UnparsableType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if node.unparsables.length > 0}
    <NodeSequenceView
        {node}
        field="unparsables"
        format={{ ...format, editable: false }}
        empty="hide"
    />
<!-- The empty marker is an editing affordance — "code is missing here" — so it's
     only shown in an editable view. Read-only renderings of code (docs, guide
     examples, changelog prose) would just show unexplained orange bars. -->
{:else if format.editable}<span class="empty">&nbsp;</span>{/if}

<style>
    .empty {
        display: inline-block;
        width: 1px;
        height: 1lh;
        outline: var(--wordplay-focus-width) solid var(--wordplay-error);
        border-radius: var(--wordplay-border-radius);
    }
</style>
