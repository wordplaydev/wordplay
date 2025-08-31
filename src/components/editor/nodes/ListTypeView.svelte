<script lang="ts">
    import type ListType from '@nodes/ListType';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: ListType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.open} {format} /><NodeView
    node={node.type}
    {format}
/><NodeView node={node.close} {format} />
