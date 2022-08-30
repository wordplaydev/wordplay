<script lang="ts">
    import type SetOrMapLiteral from "../nodes/SetOrMapLiteral";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: SetOrMapLiteral;

</script>

<div class="node-view">
    <TokenView node={node.open}/>
    {#if node.bind}<TokenView node={node.bind}/>{/if}
    {#each node.values as value}<svelte:component this={renderNode(value)} node={value} />{/each}
    <TokenView node={node.close}/>
</div>