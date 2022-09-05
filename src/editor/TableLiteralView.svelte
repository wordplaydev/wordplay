<script lang="ts">
    import type TableLiteral from "../nodes/TableLiteral";
    import OptionalNodeView from "./OptionalNodeView.svelte";

    export let node: TableLiteral;

</script>

{#each node.columns as col}<OptionalNodeView node={col}/>{/each}<OptionalNodeView node={node.close}/>{#each node.rows as row}<OptionalNodeView node={row}/>{/each}