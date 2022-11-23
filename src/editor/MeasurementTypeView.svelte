<svelte:options immutable={true}/>
<script lang="ts">
    import type MeasurementType from "../nodes/MeasurementType";
    import Node from "../nodes/Node";
    import NodeView from "./NodeView.svelte";

    export let node: MeasurementType;

</script>

<NodeView node={node.number}/>{#if node.unit instanceof Node}<NodeView node={node.unit}/>{/if}