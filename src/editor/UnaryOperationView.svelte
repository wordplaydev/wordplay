<svelte:options immutable={true} />

<script lang="ts">
    import type UnaryOperation from '../nodes/UnaryOperation';
    import NodeView from './NodeView.svelte';

    export let node: UnaryOperation;
</script>

<NodeView node={node.operator} /><NodeView node={node.operand} />
