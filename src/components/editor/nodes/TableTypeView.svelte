<script lang="ts">
    import type TableType from '@nodes/TableType';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: TableType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.open} {format} /><NodeSequenceView
    {node}
    field="columns"
    {format}
/><NodeView node={node.close} {format} />
