<script lang="ts">
    import type TypeInputs from '@nodes/TypeInputs';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: TypeInputs;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.open} {format} /><NodeSequenceView
    {node}
    field="types"
    {format}
/><NodeView node={node.close} {format} />
