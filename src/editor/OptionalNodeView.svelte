<script lang="ts">
    import renderNode from "./renderNode";
    import type Node from "../nodes/Node";
    import NodeView from "./NodeView.svelte";

    export let node: Node | undefined;
</script>

{#if node !== undefined}<NodeView node={node}><svelte:component this={renderNode(node)} node={node} /></NodeView>{/if}