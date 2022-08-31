<script lang="ts">
    import type ListAccess from "../nodes/ListAccess";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: ListAccess;

</script>

<div class="node-view">
    <NodeView node={node.list}/><TokenView node={node.open}/><NodeView node={node.index}/><TokenView node={node.close}/>
</div>