<svelte:options immutable={true}/>
<script lang="ts">
    import type ColumnType from "../nodes/ColumnType";
    import NodeView from "./NodeView.svelte";

    export let node: ColumnType;

</script>

<NodeView node={node.bar}/><NodeView node={node.bind}/>