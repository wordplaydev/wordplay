<svelte:options immutable={true}/>
<script lang="ts">
    import type Node from "../nodes/Node";
    import NodeView from "./NodeView.svelte";

    export let node: Node;

</script>

<div class="root"><NodeView {node}/></div>