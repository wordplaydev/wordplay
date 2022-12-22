<svelte:options immutable={true}/>
<script lang="ts">
    import type Node from "../nodes/Node";
    import NodeView from "./NodeView.svelte";
    
    export let nodes: Node[];

</script>

{#each nodes as node }<NodeView node={node} />{/each}