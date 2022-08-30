<script lang="ts">
    import type SetOrMapAccess from "../nodes/SetOrMapAccess";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: SetOrMapAccess;

</script>

<div class="node-view">
    <svelte:component this={renderNode(node.setOrMap)} node={node.setOrMap} />
    <TokenView node={node.open}/>
    <svelte:component this={renderNode(node.key)} node={node.key} />
    <TokenView node={node.close}/>
</div>