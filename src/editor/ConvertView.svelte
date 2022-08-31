<script lang="ts">
    import type Convert from "../nodes/Convert";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Convert;

</script>

<div class="node-view">
    <NodeView node={node.expression}/><TokenView node={node.convert}/><NodeView node={node.type}/>
</div>