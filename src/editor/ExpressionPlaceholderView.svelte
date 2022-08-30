<script lang="ts">
    import type ExpressionPlaceholder from "../nodes/PlaceholderExpression";
    import TokenView from "./TokenView.svelte";
    
    export let node: ExpressionPlaceholder;

</script>

<div class="node-view">
    <TokenView node={node.etc} />
</div>