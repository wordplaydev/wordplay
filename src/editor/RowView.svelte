<script lang="ts">
    import type Row from "../nodes/Row";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";

    export let node: Row;

</script>

<NodeView node={node}>
    {#each node.cells as cell}<OptionalNodeView node={cell}/>{/each}<OptionalNodeView node={node.close}/>
</NodeView>