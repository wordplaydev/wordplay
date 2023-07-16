<svelte:options immutable={true} />

<script lang="ts">
    import type StructureDefinition from '@nodes/StructureDefinition';
    import NodeSequenceView from './NodeSequenceView.svelte';
    import NodeView from './NodeView.svelte';

    export let node: StructureDefinition;
</script>

<NodeView node={node.docs} /><NodeView node={node.share} /><NodeView
    node={node.type}
/><NodeView node={node.names} /><NodeSequenceView
    nodes={node.interfaces}
/><NodeView node={node.types} /><NodeView node={node.open} /><NodeSequenceView
    nodes={node.inputs}
/><NodeView node={node.close} /><NodeView node={node.expression} />
