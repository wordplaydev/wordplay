<script lang="ts">
    import type TableLiteral from '@nodes/TableLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: TableLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.type} {format} /><NodeSequenceView
    {node}
    block={node.rows.length > 1}
    field="rows"
    {format}
    empty="label"
/>
