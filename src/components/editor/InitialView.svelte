<svelte:options immutable={true} />

<script lang="ts">
    import type Initial from '../../nodes/Initial';
    import NodeView from './NodeView.svelte';

    export let node: Initial;
</script>

<NodeView node={node.diamond} />
