<script lang="ts">
    import type TypeVariable from "../nodes/TypeVariable";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: TypeVariable;

</script>

<NodeView node={node}>
    <TokenView node={node.type}/><TokenView node={node.name}/>
</NodeView>