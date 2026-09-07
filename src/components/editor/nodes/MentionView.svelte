<script lang="ts">
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import type Mention from '@nodes/Mention';

    interface Props {
        node: Mention;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'name']} {format} />
