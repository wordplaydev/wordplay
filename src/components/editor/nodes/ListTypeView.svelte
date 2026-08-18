<script lang="ts">
    import type ListType from '@nodes/ListType';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: ListType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'open']} {format} /><NodeSequenceView
    {node}
    field="types"
    {format}
    empty="label"
/><NodeView node={[node, 'close']} {format} />
