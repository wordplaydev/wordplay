<script lang="ts">
    import type Select from "../nodes/Select";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Select;

</script>

<NodeView node={node}>
    <OptionalNodeView node={node.table}/><TokenView node={node.select}/><OptionalNodeView node={node.row}/><OptionalNodeView node={node.query}/>
</NodeView>