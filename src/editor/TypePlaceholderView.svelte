<script lang="ts">
    import type TypePlaceholder from "../nodes/TypePlaceholder";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: TypePlaceholder;

</script>

<NodeView node={node}>
    <TokenView node={node.etc} />
</NodeView>