<script lang="ts">
    import type StreamType from "../nodes/StreamType";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: StreamType;

</script>

<NodeView node={node}>
    <TokenView node={node.stream}/><OptionalNodeView node={node.type}/>
</NodeView>