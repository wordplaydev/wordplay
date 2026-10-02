<script lang="ts">
    import type NumberType from '#nodes/NumberType.ts';
    import Unit from '#nodes/Unit.ts';
    import NodeView, {
        type Format,
    } from '#components/editor/nodes/NodeView.svelte';

    interface Props {
        node: NumberType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView
    node={[node, 'number']}
    {format}
/>{#if format.editable || (node.unit instanceof Unit && !node.unit.isEmpty())}<NodeView
        node={[node, 'unit']}
        {format}
        empty="menu"
    />{/if}
