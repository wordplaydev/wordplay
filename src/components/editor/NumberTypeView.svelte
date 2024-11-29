<script lang="ts">
    import type NumberType from '@nodes/NumberType';
    import Node from '@nodes/Node';
    import NodeView from './NodeView.svelte';

    interface Props {
        node: NumberType;
    }

    let { node }: Props = $props();
</script>

<NodeView node={node.number} />{#if node.unit instanceof Node}<NodeView
        node={node.unit}
        small
    />{/if}
