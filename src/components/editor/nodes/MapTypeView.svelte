<script lang="ts">
    import type MapType from '@nodes/MapType';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: MapType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.open} {format} /><NodeView
    node={node.key}
    {format}
/><NodeView node={node.bind} {format} /><NodeView
    node={node.value}
    {format}
/><NodeView node={node.close} {format} />
