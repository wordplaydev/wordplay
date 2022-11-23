<svelte:options immutable={true}/>
<script lang="ts">
    import type Cell from "../nodes/Cell";
    import NodeView from "./NodeView.svelte";
 
    export let node: Cell;

</script>

<NodeView node={node.bar}/><NodeView node={node.value}/>