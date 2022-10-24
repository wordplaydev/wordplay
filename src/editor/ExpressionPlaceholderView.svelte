<script lang="ts">
    import type ExpressionPlaceholder from "../nodes/ExpressionPlaceholder";
    import NodeView from "./NodeView.svelte";
    
    export let node: ExpressionPlaceholder;

</script>

<NodeView node={node.placeholder} />