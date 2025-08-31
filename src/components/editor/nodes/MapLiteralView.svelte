<script lang="ts">
    import type MapLiteral from '@nodes/MapLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: MapLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.open} {format} /><NodeView
    node={node.bind}
    {format}
/><NodeSequenceView nodes={node.values} {format} elide /><NodeView
    node={node.close}
    {format}
/><NodeView node={node.literal} {format} />
