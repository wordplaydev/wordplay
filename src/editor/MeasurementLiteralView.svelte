<script lang="ts">
    import type MeasurementLiteral from "../nodes/MeasurementLiteral";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: MeasurementLiteral;

</script>

<NodeView node={node}><TokenView node={node.number}/><small><OptionalNodeView node={node.unit}/></small></NodeView>