<script lang="ts">
    import type Source from '@nodes/Source';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: Source;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'expression']} {format} />
