<script lang="ts">
    import type MapLiteral from '@nodes/MapLiteral';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: MapLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();

    /** When the source has newlines between any of the values, lay out the
        values as a column rather than a wrapping inline row. A wrapping row
        forces its container to fill the editor's width because of the
        flex-basis: 100% line breaks; a column fits its content naturally. */
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
