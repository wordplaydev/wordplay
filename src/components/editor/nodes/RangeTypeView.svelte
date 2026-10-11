<script lang="ts">
    import type RangeType from '#nodes/RangeType.ts';
    import Unit from '#nodes/Unit.ts';
    import NodeView, {
        type Format,
    } from '#components/editor/nodes/NodeView.svelte';

    interface Props {
        node: RangeType;
        format: Format;
    }

    let { node, format }: Props = $props();
</script>

<NodeView node={[node, 'range']} {format} /><NodeView
    node={[node, 'none']}
    {format}
    empty="hide"
/>{#if format.editable || (node.unit instanceof Unit && !node.unit.isEmpty())}<NodeView
        node={[node, 'unit']}
        {format}
        empty="menu"
    />{/if}
