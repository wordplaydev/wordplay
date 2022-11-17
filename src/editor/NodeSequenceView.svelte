<script lang="ts">
    import type Node from "../nodes/Node";
    import NodeView from "./NodeView.svelte";
    
    export let nodes: Node[];

</script>

<!-- For whatever insertion point matches, if the list-owning parent prefers a line break and there aren't at least two, insert one to make visual space for dropping. -->
<!-- For the last item in the list, we use the last item in the list. -->
{#each nodes as node }<NodeView node={node} />{/each}