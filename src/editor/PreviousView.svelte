<script lang="ts">
    import type Previous from "../nodes/Previous";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Previous;

</script>

<div class="node-view">
    <NodeView node={node.stream}/>
    <TokenView node={node.previous}/>
    <NodeView node={node.index}/>
</div>