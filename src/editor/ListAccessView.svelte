<script lang="ts">
    import type ListAccess from "../nodes/ListAccess";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: ListAccess;

</script>

<NodeView node={node}>
    <OptionalNodeView node={node.list}/><TokenView node={node.open}/><OptionalNodeView node={node.index}/><TokenView node={node.close}/>
</NodeView>