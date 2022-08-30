<script lang="ts">
    import type KeyValue from "../nodes/KeyValue";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: KeyValue;

</script>

<div class="node-view">
    <svelte:component this={renderNode(node.key)} node={node.key} />
    <TokenView node={node.bind}/>
    <svelte:component this={renderNode(node.value)} node={node.value} />
</div>