<script lang="ts">
    import type SetOrMapType from "../nodes/SetOrMapType";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: SetOrMapType;

</script>

<div class="node-view">
    <TokenView node={node.open}/>
    {#if node.key}<svelte:component this={renderNode(node.key)} node={node.key} />{/if}
    {#if node.bind}<TokenView node={node.bind}/>{/if}
    {#if node.value}<svelte:component this={renderNode(node.value)} node={node.value} />{/if}
    <TokenView node={node.close}/>
</div>