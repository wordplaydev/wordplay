<script lang="ts">
    import type MeasurementLiteral from "../nodes/MeasurementLiteral";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: MeasurementLiteral;

</script>

<div class="node-view"><TokenView node={node.number}/><NodeView node={node.unit}/></div>