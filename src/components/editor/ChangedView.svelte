<svelte:options immutable={true} />

<script lang="ts">
    import type Changed from '@nodes/Changed';
    import NodeView from './NodeView.svelte';

    export let node: Changed;
</script>

<NodeView node={node.change} /><NodeView node={node.stream} />
