<script lang="ts">
    import type BinaryOperation from "../nodes/BinaryOperation";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: BinaryOperation;

</script>

<NodeView node={node}>
    <OptionalNodeView node={node.left}/><TokenView node={node.operator}/><OptionalNodeView node={node.right}/>
</NodeView>