<script lang="ts">
    import type Reaction from "../nodes/Reaction";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: Reaction;

</script>

<div class="node-view">
    <svelte:component this={renderNode(node.initial)} node={node.initial} />
    <TokenView node={node.delta}/>
    <svelte:component this={renderNode(node.stream)} node={node.stream} />
    <svelte:component this={renderNode(node.next)} node={node.next} />
</div>