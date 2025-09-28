<script lang="ts">
    import type MapLiteral from '@nodes/MapLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: MapLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

{#if format.block}
    <NodeView node={[node, 'open']} {format} />
    <NodeSequenceView
        {node}
        field="values"
        {format}
        elide
        empty="label"
        block={node.values.reduce((sum, v) => sum + v.toWordplay().length, 0) >
            32}
    />
    <NodeView node={[node, 'close']} {format} />
    <NodeView node={[node, 'literal']} {format} />
{:else}
    <NodeView node={[node, 'open']} {format} /><NodeSequenceView
        {node}
        field="values"
        {format}
        elide
        empty="label"
    /><NodeView node={[node, 'close']} {format} /><NodeView
        node={[node, 'literal']}
        {format}
    />
{/if}
