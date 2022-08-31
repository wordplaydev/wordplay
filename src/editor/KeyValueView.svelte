<script lang="ts">
    import type KeyValue from "../nodes/KeyValue";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: KeyValue;

</script>

<div class="node-view">
    <NodeView node={node.key}/>
    <TokenView node={node.bind}/>
    <NodeView node={node.value}/>
</div>