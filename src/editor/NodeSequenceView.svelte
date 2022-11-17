<script lang="ts">
    import type { InsertionPoint } from "../models/Caret";
    import type Node from "../nodes/Node";
    import { getInsertionPoints } from "./Contexts";
    import InsertionPointView from "./InsertionPointView.svelte";
    import NodeView from "./NodeView.svelte";
    
    export let nodes: Node[];

    let insertionPoints = getInsertionPoints();
    $: insertion = $insertionPoints?.get(nodes);
 
    function needsLineBreak(insertion: InsertionPoint, node: Node | undefined) {
        const prefersLineBreak = node === undefined ? false : insertion.node.getPreferredPrecedingSpace(node, "").indexOf("\n") >= 0;
        const hasEmptyLineBreak = node === undefined ? false : node.getPrecedingSpace().split("\n").length - 1 > 1;
        return prefersLineBreak && !hasEmptyLineBreak;
    }

</script>

<!-- For whatever insertion point matches, if the list-owning parent prefers a line break and there aren't at least two, insert one to make visual space for dropping. -->
<!-- For the last item in the list, we use the last item in the list. -->
{#each nodes as node, index }{#if insertion && insertion.index === index}<InsertionPointView linebreak={needsLineBreak(insertion, node)}/>{/if}<NodeView node={node} />{/each}{#if insertion && insertion.index === nodes.length}<InsertionPointView linebreak={needsLineBreak(insertion, nodes[nodes.length - 1])}/>{/if}