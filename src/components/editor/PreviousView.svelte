<svelte:options immutable={true} />

<script lang="ts">
    import type Previous from '@nodes/Previous';
    import NodeView from './NodeView.svelte';

    export let node: Previous;
</script>

<NodeView node={node.previous} /><NodeView node={node.range} /><NodeView
    node={node.number}
/><NodeView node={node.stream} />
