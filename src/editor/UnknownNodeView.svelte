<script lang="ts">
    export let node: Node;

</script>

<div class="node-view">
    {node.constructor.name}
</div>

<style>

    div {
        background-color: rgb(255,240,240);
    }

</style>