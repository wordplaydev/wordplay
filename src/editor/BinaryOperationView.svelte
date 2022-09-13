<script lang="ts">
    import type BinaryOperation from "../nodes/BinaryOperation";
    import NodeView from "./NodeView.svelte";

    export let node: BinaryOperation;

</script>

<NodeView node={node.left}/><NodeView node={node.operator}/><NodeView node={node.right}/>