<script lang="ts">
    import type Template from "../nodes/Template";
import LanguageView from "./LanguageView.svelte";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: Template;

</script>

<div class="node-view">
    {#each node.parts as part }<svelte:component this={renderNode(part)} node={part} />{/each}
    {#if node.format}<LanguageView node={node.format}/>{/if}
</div>