<svelte:options immutable={true} />

<script lang="ts">
    import type ListAccess from '../nodes/ListAccess';
    import NodeView from './NodeView.svelte';

    export let node: ListAccess;
</script>

<NodeView node={node.list} /><NodeView node={node.open} /><NodeView
    node={node.index}
/><NodeView node={node.close} />
