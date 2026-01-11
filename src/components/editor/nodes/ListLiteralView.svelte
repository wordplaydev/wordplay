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
    <NodeView node={[node, 'open']} {format} />
    <NodeSequenceView
        {node}
        field="values"
        {format}
        elide
        empty="label"
        wrap
        breaks
    />
    <NodeView node={[node, 'close']} {format} />
    <!-- Too advanced of a feature. Let's hide it for now. -->
    <NodeView node={[node, 'literal']} {format} empty="hide" />
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
