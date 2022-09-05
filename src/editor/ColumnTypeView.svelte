<script lang="ts">
    import type ColumnType from "../nodes/ColumnType";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: ColumnType;

</script>

<NodeView node={node}>
    <TokenView node={node.bar}/><OptionalNodeView node={node.bind}/>
</NodeView>
