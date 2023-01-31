<svelte:options immutable={true} />

<script lang="ts">
    import type PropertyReference from '@nodes/PropertyReference';
    import NodeView from './NodeView.svelte';

    export let node: PropertyReference;
</script>

<NodeView node={node.structure} /><NodeView node={node.dot} /><NodeView
    node={node.name}
/>
