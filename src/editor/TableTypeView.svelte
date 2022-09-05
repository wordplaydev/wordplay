<script lang="ts">
    import type TableType from "../nodes/TableType";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";

    export let node: TableType;

</script>

<NodeView node={node}>
    {#each node.columns as col}<OptionalNodeView node={col}/>{/each}<OptionalNodeView node={node.close}/>
</NodeView>