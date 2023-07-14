<svelte:options immutable={true} />

<script lang="ts">
    import type Source from '../../nodes/Source';
    import NodeView from './NodeView.svelte';

    export let node: Source;
</script>

<NodeView node={node.expression} />
