<svelte:options immutable={true} />

<script lang="ts">
    import type TypePlaceholder from '@nodes/TypePlaceholder';
    import NodeView from './NodeView.svelte';

    export let node: TypePlaceholder;
</script>

<NodeView node={node.placeholder} />
