<script lang="ts">
    import type NumberType from '@nodes/NumberType';
    import Unit from '@nodes/Unit';
    import NodeView, { type Format } from './NodeView.svelte';

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
