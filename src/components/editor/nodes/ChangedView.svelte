<script lang="ts">
    import type Changed from '@nodes/Changed';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: Changed;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'change']} {format} /><NodeView
    node={[node, 'stream']}
    {format}
/>
