<script lang="ts">
    import type ListLiteral from '@nodes/ListLiteral';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: ListLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();

    /** Render values as a column when the source has newlines between any of
        them. A wrapping inline list forces its container to fill editor width
        because of flex-basis: 100% line breaks; a column fits its content. */
    let vertical = $derived(
        format.block &&
            format.spaces !== undefined &&
            node.values.some((v) =>
                format.spaces!.getSpace(v).includes('\n'),
            ),
    );
</script>

{#if format.block}
    <NodeView node={[node, 'open']} {format} />
    <NodeSequenceView
        {node}
        field="values"
        {format}
        elide
        empty="label"
        direction={vertical ? 'block' : 'inline'}
        wrap={!vertical}
        breaks={!vertical}
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
