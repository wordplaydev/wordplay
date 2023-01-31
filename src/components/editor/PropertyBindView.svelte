<svelte:options immutable={true} />

<script lang="ts">
    import type PropertyBind from '@nodes/PropertyBind';
    import NodeView from './NodeView.svelte';

    export let node: PropertyBind;
</script>

<NodeView node={node.reference} /><NodeView node={node.bind} /><NodeView
    node={node.value}
/>
