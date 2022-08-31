<script lang="ts">
    import renderNode from "./renderNode";
    import type Node from "../nodes/Node";

    export let node: Node | undefined;
</script>

{#if node !== undefined}<svelte:component this={renderNode(node)} node={node} />{/if}