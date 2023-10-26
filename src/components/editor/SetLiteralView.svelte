<svelte:options immutable={true} />

<script lang="ts">
    import type SetLiteral from '@nodes/SetLiteral';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    export let node: SetLiteral;
</script>

<NodeView node={node.open} /><NodeSequenceView
    nodes={node.values}
    elide
/><NodeView node={node.close} /><NodeView node={node.literal} />
