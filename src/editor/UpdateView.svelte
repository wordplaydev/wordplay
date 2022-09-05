<script lang="ts">
    import type Update from "../nodes/Update";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Update;

</script>

<NodeView node={node}>
    <OptionalNodeView node={node.table}/><TokenView node={node.update}/><OptionalNodeView node={node.row}/><OptionalNodeView node={node.query}/>
</NodeView>