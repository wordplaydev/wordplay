<svelte:options immutable={true}/>
<script lang="ts">
    import type Column from "../nodes/Column";
    import NodeView from "./NodeView.svelte";

    export let node: Column;

</script>

<NodeView node={node.bar}/><NodeView node={node.bind}/>
