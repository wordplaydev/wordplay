<script lang="ts">
    import type Previous from "../nodes/Previous";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: Previous;

</script>

<div class="node-view">
    <svelte:component this={renderNode(node.stream)} node={node.stream} />
    <TokenView node={node.previous}/>
    <svelte:component this={renderNode(node.index)} node={node.index} />
</div>