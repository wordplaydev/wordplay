<script lang="ts">
    import type TypeInputs from '@nodes/TypeInputs';
    import NodeSequenceView from '@components/editor/nodes/NodeSequenceView.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: TypeInputs;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'open']} {format} /><NodeSequenceView
    {node}
    field="types"
    {format}
    empty="menu"
/><NodeView node={[node, 'close']} {format} />
