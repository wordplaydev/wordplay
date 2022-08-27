<script lang="ts">
    import type ListType from "../nodes/ListType";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: ListType;

</script>

<div class="node-view">
    <TokenView node={node.open}/>
    {#if node.type }<svelte:component this={renderNode(node.type)} node={node.type} />{/if}
    <TokenView node={node.close}/>
</div>