<svelte:options immutable={true} />

<script lang="ts">
    import type Update from '@nodes/Update';
    import NodeView from './NodeView.svelte';

    export let node: Update;
</script>

<NodeView node={node.table} /><NodeView node={node.row} /><NodeView
    node={node.query}
/>
