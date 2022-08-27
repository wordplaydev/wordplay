<script lang="ts">
    import type ListLiteral from "../nodes/ListLiteral";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: ListLiteral;

</script>

<div class="node-view">
    <TokenView node={node.open}/>
    {#each node.values as value }<svelte:component this={renderNode(value)} node={value} />{/each}
    <TokenView node={node.close}/>
</div>