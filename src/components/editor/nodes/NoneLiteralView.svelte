<script lang="ts">
    import type NoneLiteral from '@nodes/NoneLiteral';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: NoneLiteral;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'none']} {format} />
