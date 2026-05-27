<script lang="ts">
    import type NoneType from '@nodes/NoneType';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';

    interface Props {
        node: NoneType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'none']} {format} />
