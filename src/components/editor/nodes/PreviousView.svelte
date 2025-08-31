<script lang="ts">
    import type Previous from '@nodes/Previous';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Previous;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.previous} {format} /><NodeView
    node={node.range}
    {format}
/><NodeView node={node.number} {format} /><NodeView
    node={node.stream}
    {format}
/>
