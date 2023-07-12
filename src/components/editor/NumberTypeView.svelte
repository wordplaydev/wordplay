<svelte:options immutable={true} />

<script lang="ts">
    import type NumberType from '@nodes/NumberType';
    import Node from '@nodes/Node';
    import NodeView from './NodeView.svelte';

    export let node: NumberType;
</script>

<NodeView node={node.number} />{#if node.unit instanceof Node}<NodeView
        node={node.unit}
        small
    />{/if}
