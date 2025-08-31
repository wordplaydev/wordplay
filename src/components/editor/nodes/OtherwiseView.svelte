<script lang="ts">
    import type Otherwise from '@nodes/Otherwise';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Otherwise;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.left} {format} /><NodeView
    node={node.question}
    {format}
/><NodeView node={node.right} {format} />
