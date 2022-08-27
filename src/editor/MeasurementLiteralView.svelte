<script lang="ts">
    import Language from "../nodes/Language";
    import type MeasurementLiteral from "../nodes/MeasurementLiteral";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: MeasurementLiteral;

</script>

<div class="node-view">
    <TokenView node={node.number}/>
    {#if node.unit } <svelte:component this={renderNode(node.unit)} node={node.unit} /> {/if}
</div>