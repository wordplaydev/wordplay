<script lang="ts">
    import { getContext } from "svelte";
    import type Node from "../nodes/Node";
    import { InsertionPointsSymbol, type InsertionPointsContext } from "./Contexts";
    import InsertionPoint from "./InsertionPoint.svelte";
    import NodeView from "./NodeView.svelte";
    
    export let nodes: Node[];

    let insertionPoints = getContext<InsertionPointsContext>(InsertionPointsSymbol);
    $: insertion = $insertionPoints?.get(nodes);

</script>

{#each nodes as node, index }{#if insertion && insertion.index === index}<InsertionPoint {insertion}/>{/if}<NodeView node={node} />{/each}{#if insertion && insertion.index === nodes.length}<InsertionPoint {insertion}/>{/if}