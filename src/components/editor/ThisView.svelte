<svelte:options immutable={true} />

<script lang="ts">
    import type This from '@nodes/This';
    import NodeView from './NodeView.svelte';

    export let node: This;
</script>

<NodeView node={node.dis} />
