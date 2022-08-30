<script lang="ts">
    import type MeasurementType from "../nodes/MeasurementType";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: MeasurementType;

</script>

<div class="node-view">
    <TokenView node={node.number}/>
    {#if node.unit } <svelte:component this={renderNode(node.unit)} node={node.unit} /> {/if}
</div>