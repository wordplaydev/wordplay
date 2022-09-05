<script lang="ts">
    import type TableLiteral from "../nodes/TableLiteral";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";

    export let node: TableLiteral;

</script>

<NodeView node={node}>
    {#each node.columns as col}<OptionalNodeView node={col}/>{/each}<OptionalNodeView node={node.close}/>{#each node.rows as row}<OptionalNodeView node={row}/>{/each}
</NodeView>