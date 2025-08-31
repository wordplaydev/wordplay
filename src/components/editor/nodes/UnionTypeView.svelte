<script lang="ts">
    import type UnionType from '@nodes/UnionType';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        node: UnionType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={node.left} {format} /><NodeView
    node={node.or}
    {format}
/><NodeView node={node.right} {format} />
