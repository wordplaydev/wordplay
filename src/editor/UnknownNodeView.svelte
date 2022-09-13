<script lang="ts">
    import type Node from "../nodes/Node";

    export let node: Node;

</script>

<span class="name">{node.constructor.name}</span>

<style>

    .name {
        background-color: rgb(255,240,240);
    }

</style>