<script lang="ts">
    import type Is from "../nodes/Is";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: Is;

</script>

<div class="node-view">
    <svelte:component this={renderNode(node.left)} node={node.left} />
    <TokenView node={node.operator}/>
    <svelte:component this={renderNode(node.right)} node={node.right} />
</div>