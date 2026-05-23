<script lang="ts">
    import type TableType from '@nodes/TableType';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: TableType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'open']} {format} /><NodeSequenceView
    {node}
    field="columns"
    {format}
    empty="label"
/><NodeView node={[node, 'close']} {format} />
