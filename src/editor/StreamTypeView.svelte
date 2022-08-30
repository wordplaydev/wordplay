<script lang="ts">
    import type StreamType from "../nodes/StreamType";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: StreamType;

</script>

<div class="node-view">
    <TokenView node={node.stream}/>
    <svelte:component this={renderNode(node.type)} node={node.type} />
</div>