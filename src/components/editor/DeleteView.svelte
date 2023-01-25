<svelte:options immutable={true} />

<script lang="ts">
    import type Delete from '@nodes/Delete';
    import NodeView from './NodeView.svelte';

    export let node: Delete;
</script>

<NodeView node={node.table} /><NodeView node={node.del} /><NodeView
    node={node.query}
/>
