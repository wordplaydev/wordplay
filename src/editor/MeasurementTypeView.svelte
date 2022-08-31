<script lang="ts">
    import type MeasurementType from "../nodes/MeasurementType";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: MeasurementType;

</script>

<NodeView node={node}><TokenView node={node.number}/><OptionalNodeView node={node.unit}/></NodeView>