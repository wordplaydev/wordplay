<script lang="ts">
    import type SetLiteral from '@nodes/SetLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: SetLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.open} {format} /><NodeSequenceView
    nodes={node.values}
    elide
    {format}
/><NodeView node={node.close} {format} /><NodeView
    node={node.literal}
    {format}
/>
