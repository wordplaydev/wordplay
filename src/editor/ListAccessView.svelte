<script lang="ts">
    import type ListAccess from "../nodes/ListAccess";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: ListAccess;

</script>

<div class="node-view">
    <svelte:component this={renderNode(node.list)} node={node.list} />
    <TokenView node={node.open}/>
    <svelte:component this={renderNode(node.index)} node={node.index} />
    <TokenView node={node.close}/>
</div>