<svelte:options immutable={true}/>
<script lang="ts">
    import type Previous from "../nodes/Previous";
    import NodeView from "./NodeView.svelte";

    export let node: Previous;

</script>

<NodeView node={node.stream}/><NodeView node={node.previous}/><NodeView node={node.index}/>