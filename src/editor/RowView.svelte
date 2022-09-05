<script lang="ts">
    import type Row from "../nodes/Row";
    import OptionalNodeView from "./OptionalNodeView.svelte";

    export let node: Row;

</script>

{#each node.cells as cell}<OptionalNodeView node={cell}/>{/each}<OptionalNodeView node={node.close}/>