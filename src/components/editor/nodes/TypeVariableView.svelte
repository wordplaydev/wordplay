<script lang="ts">
    import type TypeVariable from '@nodes/TypeVariable';
    import NodeView, { type Format } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: TypeVariable;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'names']} {format} />
