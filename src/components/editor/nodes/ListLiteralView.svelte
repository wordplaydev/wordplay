<script lang="ts">
    import type ListLiteral from '@nodes/ListLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: ListLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <NodeView node={node.open} {format} />
    <NodeSequenceView
        nodes={node.values}
        {format}
        elide
        block={node.toWordplay().length > 32}
    />
    <NodeView node={node.close} {format} />
    <NodeView node={node.literal} {format} />
{:else}
    <NodeView node={node.open} {format} /><NodeSequenceView
        nodes={node.values}
        {format}
        elide
    /><NodeView node={node.close} {format} /><NodeView
        node={node.literal}
        {format}
    />
{/if}
