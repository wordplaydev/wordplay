<script lang="ts">
    import type MeasurementType from "../nodes/MeasurementType";
    import NodeView from "./NodeView.svelte";

    export let node: MeasurementType;

</script>

<NodeView node={node.number}/><NodeView node={node.unit}/>