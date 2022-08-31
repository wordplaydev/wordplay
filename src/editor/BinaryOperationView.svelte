<script lang="ts">
    import type BinaryOperation from "../nodes/BinaryOperation";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: BinaryOperation;

</script>

<div class="node-view">
    <NodeView node={node.left}/><TokenView node={node.operator}/><NodeView node={node.right}/>
</div>