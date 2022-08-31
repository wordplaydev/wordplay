<script lang="ts">
    import type UnaryOperation from "../nodes/UnaryOperation";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: UnaryOperation;

</script>

<NodeView node={node}>
    <TokenView node={node.operator}/><OptionalNodeView node={node.operand}/>
</NodeView>