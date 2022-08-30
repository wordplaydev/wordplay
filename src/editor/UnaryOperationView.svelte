<script lang="ts">
    import type UnaryOperation from "../nodes/UnaryOperation";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: UnaryOperation;

</script>

<div class="node-view">
    <TokenView node={node.operator}/><svelte:component this={renderNode(node.operand)} node={node.operand} />
</div>