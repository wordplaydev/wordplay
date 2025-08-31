<script lang="ts">
    import type Doc from '@nodes/Doc';
    import NodeView, { type Format } from './NodeView.svelte';

    interface DocProps {
        node: Doc;
        format: Format;
    }

    let { node, format }: DocProps = $props();
</script>

<NodeView node={node.open} {format} /><NodeView
    node={node.markup}
    {format}
/><NodeView node={node.close} {format} /><NodeView
    node={node.language}
    {format}
/><NodeView node={node.separator} {format} />
