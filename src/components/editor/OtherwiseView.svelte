<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type Otherwise from '@nodes/Otherwise';

    export let node: Otherwise;
</script>

<NodeView node={node.left} /><NodeView node={node.question} /><NodeView
    node={node.right}
/>
