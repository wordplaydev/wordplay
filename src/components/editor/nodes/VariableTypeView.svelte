<script lang="ts">
    import type VariableType from '#nodes/VariableType.ts';
    import NodeView, {
        type Format,
    } from '#components/editor/nodes/NodeView.svelte';

    interface Props {
        node: VariableType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'definition']} {format} />
