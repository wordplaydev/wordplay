<script lang="ts">
    import type TableLiteral from '@nodes/TableLiteral';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: TableLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'type']} {format} /><NodeSequenceView
    {node}
    direction={node.rows.length > 1 ? 'block' : 'inline'}
    field="rows"
    {format}
    empty="label"
/>
