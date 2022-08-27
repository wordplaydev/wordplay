<script lang="ts">
    import type Block from "../nodes/Block";
import DocsView from "./DocsView.svelte";
    import renderNode from "./renderNode";

    export let node: Block;

</script>

<div class="node-view">
    <DocsView docs={node.docs}/>
    {#if node.open } <svelte:component this={renderNode(node.open)} node={node.open} /> {/if}
    {#each node.statements as statement }<svelte:component this={renderNode(statement)} node={statement} />{/each}
    {#if node.close } <svelte:component this={renderNode(node.close)} node={node.close} /> {/if}
</div>