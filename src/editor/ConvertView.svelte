<script lang="ts">
    import type Convert from "../nodes/Convert";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: Convert;

</script>

<div class="node-view">
    <svelte:component this={renderNode(node.expression)} node={node.expression} />
    <TokenView node={node.convert}/>
    <svelte:component this={renderNode(node.type)} node={node.type} />
</div>