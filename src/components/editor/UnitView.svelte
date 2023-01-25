<svelte:options immutable={true} />

<script lang="ts">
    import type Unit from '@nodes/Unit';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    export let node: Unit;
</script>

<NodeSequenceView nodes={node.numerator} /><NodeView
    node={node.slash}
/><NodeSequenceView nodes={node.denominator} />
