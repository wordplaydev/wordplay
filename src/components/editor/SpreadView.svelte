<svelte:options immutable={true} />

<script lang="ts">
    import NodeView from './NodeView.svelte';
    import type Spread from '../../nodes/Spread';

    export let node: Spread;
</script>

<NodeView node={node.dots} /><NodeView node={node.list} />
