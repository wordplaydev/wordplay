<script lang="ts">
    import type ListType from "../nodes/ListType";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: ListType;

</script>

<NodeView node={node}>
    <TokenView node={node.open}/><OptionalNodeView node={node.type}/><TokenView node={node.close}/>
</NodeView>