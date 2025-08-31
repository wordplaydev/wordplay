<script lang="ts">
    import type Delete from '@nodes/Delete';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Delete;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.table} {format} /><NodeView
    node={node.del}
    {format}
/><NodeView node={node.query} {format} />
