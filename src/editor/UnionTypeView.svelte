<script lang="ts">
    import type UnionType from "../nodes/UnionType";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: UnionType;

</script>

<div class="node-view">
    <svelte:component this={renderNode(node.left)} node={node.left} />
    <TokenView node={node.or}/>
    <svelte:component this={renderNode(node.right)} node={node.right} />
</div>