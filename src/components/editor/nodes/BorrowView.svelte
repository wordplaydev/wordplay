<script lang="ts">
    import type Borrow from '@nodes/Borrow';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: Borrow;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.borrow} {format} /><NodeView
    node={node.source}
    {format}
/><NodeView node={node.dot} {format} /><NodeView
    node={node.name}
    {format}
/><NodeView node={node.version} {format} />
