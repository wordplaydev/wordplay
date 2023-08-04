<svelte:options immutable={true} />

<script lang="ts">
    import type Insert from '@nodes/Insert';
    import NodeView from './NodeView.svelte';

    export let node: Insert;
</script>

<NodeView node={node.table} /><NodeView node={node.row} />
