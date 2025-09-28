<script lang="ts">
    import type StreamType from '@nodes/StreamType';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: StreamType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'stream']} {format} /><NodeView
    node={[node, 'type']}
    {format}
/>
