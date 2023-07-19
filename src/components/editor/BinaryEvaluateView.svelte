<svelte:options immutable={true} />

<script lang="ts">
    import type BinaryEvaluate from '@nodes/BinaryEvaluate';
    import NodeView from './NodeView.svelte';

    export let node: BinaryEvaluate;
</script>

<NodeView node={node.left} /><NodeView node={node.operator} /><NodeView
    node={node.right}
/>
