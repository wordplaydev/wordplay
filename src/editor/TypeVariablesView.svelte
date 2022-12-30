<svelte:options immutable={true} />

<script lang="ts">
    import type TypeVariables from '../nodes/TypeVariables';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    export let node: TypeVariables;
</script>

<NodeView node={node.open} /><NodeSequenceView
    nodes={node.variables}
/><NodeView node={node.close} />
