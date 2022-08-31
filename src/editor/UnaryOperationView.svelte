<script lang="ts">
    import type UnaryOperation from "../nodes/UnaryOperation";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: UnaryOperation;

</script>

<div class="node-view">
    <TokenView node={node.operator}/><NodeView node={node.operand}/>
</div>