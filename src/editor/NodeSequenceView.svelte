<script lang="ts">
    import type Node from "../nodes/Node";
    import { getInsertionPoints } from "./Contexts";
    import InsertionPoint from "./InsertionPoint.svelte";
    import NodeView from "./NodeView.svelte";
    
    export let nodes: Node[];

    let insertionPoints = getInsertionPoints();
    $: insertion = $insertionPoints?.get(nodes);

</script>

{#each nodes as node, index }{#if insertion && insertion.index === index}<InsertionPoint {insertion}/>{/if}<NodeView node={node} />{/each}{#if insertion && insertion.index === nodes.length}<InsertionPoint {insertion}/>{/if}