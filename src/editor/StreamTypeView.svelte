<script lang="ts">
    import type StreamType from "../nodes/StreamType";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: StreamType;

</script>

<div class="node-view">
    <TokenView node={node.stream}/><NodeView node={node.type}/>
</div>