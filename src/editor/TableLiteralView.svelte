<svelte:options immutable={true}/>
<script lang="ts">
    import type TableLiteral from "../nodes/TableLiteral";
    import NodeSequenceView from "./NodeSequenceView.svelte";
    import NodeView from "./NodeView.svelte";

    export let node: TableLiteral;

</script>

<NodeView node={node.type}/><NodeSequenceView nodes={node.rows}/>