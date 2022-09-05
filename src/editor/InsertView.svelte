<script lang="ts">
    import type Insert from "../nodes/Insert";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Insert;

</script>

<NodeView node={node}>
    <OptionalNodeView node={node.table}/><TokenView node={node.insert}/><OptionalNodeView node={node.row}/>
</NodeView>