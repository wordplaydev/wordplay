<script lang="ts">
    import type ListType from "../nodes/ListType";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: ListType;

</script>

<div class="node-view">
    <TokenView node={node.open}/><NodeView node={node.type}/><TokenView node={node.close}/>
</div>