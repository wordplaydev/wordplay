<script lang="ts">
    import type Delete from "../nodes/Delete";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Delete;

</script>

<NodeView node={node}>
    <OptionalNodeView node={node.table}/><TokenView node={node.del}/><OptionalNodeView node={node.query}/>
</NodeView>