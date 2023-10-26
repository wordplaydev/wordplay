<svelte:options immutable={true} />

<script lang="ts">
    import type MapLiteral from '@nodes/MapLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    export let node: MapLiteral;
</script>

<NodeView node={node.open} /><NodeView node={node.bind} /><NodeSequenceView
    nodes={node.values}
    elide
/><NodeView node={node.close} /><NodeView node={node.literal} />
