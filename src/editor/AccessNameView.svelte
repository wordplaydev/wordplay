<script lang="ts">
    import type AccessName from "../nodes/AccessName";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: AccessName;

</script>

<div class="node-view">
    <svelte:component this={renderNode(node.subject)} node={node.subject} />
    <TokenView node={node.access}/>
    <TokenView node={node.name}/>
</div>