<svelte:options immutable={true} />

<script lang="ts">
    import type TypeVariable from '@nodes/TypeVariable';
    import NodeView from './NodeView.svelte';

    export let node: TypeVariable;
</script>

<NodeView node={node.names} />
