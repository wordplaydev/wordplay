<script lang="ts">
    import type Node from "../nodes/Node";
    import NodeView from "./NodeView.svelte";

    export let node: Node;

</script>

<NodeView node={node}>
    {node.constructor.name}
</NodeView>

<style>

    div {
        background-color: rgb(255,240,240);
    }

</style>