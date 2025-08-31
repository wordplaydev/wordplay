<script lang="ts">
    import type Update from '@nodes/Update';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Update;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.table} {format} /><NodeView
    node={node.row}
    {format}
/><NodeView node={node.query} {format} />
