<script lang="ts">
    import type ListAccess from '@nodes/ListAccess';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: ListAccess;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.list} {format} /><NodeView
    node={node.open}
    {format}
/><NodeView node={node.index} {format} /><NodeView node={node.close} {format} />
