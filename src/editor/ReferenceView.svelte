<svelte:options immutable={true}/>
<script lang="ts">
    import type Reference from "../nodes/Reference";
    import NodeView from "./NodeView.svelte";
    
    export let node: Reference;

</script>

<NodeView node={node.name} />