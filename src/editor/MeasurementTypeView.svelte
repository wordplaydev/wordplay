<script lang="ts">
    import type MeasurementType from "../nodes/MeasurementType";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: MeasurementType;

</script>

<div class="node-view">
    <TokenView node={node.number}/><NodeView node={node.unit}/>
</div>