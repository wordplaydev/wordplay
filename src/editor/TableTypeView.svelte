<script lang="ts">
    import type TableType from "../nodes/TableType";
    import OptionalNodeView from "./OptionalNodeView.svelte";

    export let node: TableType;

</script>

{#each node.columns as col}<OptionalNodeView node={col}/>{/each}<OptionalNodeView node={node.close}/>