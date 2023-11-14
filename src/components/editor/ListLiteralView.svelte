<svelte:options immutable={true} />

<script lang="ts">
    import type ListLiteral from '@nodes/ListLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    export let node: ListLiteral;
</script>

<NodeView node={node.open} /><NodeSequenceView
    nodes={node.values}
    elide
/><NodeView node={node.close} /><NodeView node={node.literal} />
