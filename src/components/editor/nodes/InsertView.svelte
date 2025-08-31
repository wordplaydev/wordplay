<script lang="ts">
    import type Insert from '@nodes/Insert';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Insert;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.table} {format} /><NodeView node={node.row} {format} />
