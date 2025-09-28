<script lang="ts">
    import Node from '@nodes/Node';
    import type NumberType from '@nodes/NumberType';
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
/>{#if node.unit instanceof Node}<NodeView
        node={[node, 'unit']}
        {format}
    />{/if}
