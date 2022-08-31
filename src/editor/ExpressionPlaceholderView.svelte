<script lang="ts">
    import type ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: ExpressionPlaceholder;

</script>

<NodeView node={node}>
    <TokenView node={node.etc} />
</NodeView>