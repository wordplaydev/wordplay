<script lang="ts">
    import type Conditional from "../nodes/Conditional";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: Conditional;

</script>

<div class="node-view">
    <span><svelte:component this={renderNode(node.condition)} node={node.condition} /> <TokenView node={node.conditional}/></span>
    <div class="choices">
        <svelte:component this={renderNode(node.yes)} node={node.yes} />
        <svelte:component this={renderNode(node.no)} node={node.no} />
    </div>
</div>

<style>
    div {
        display: flex;
        flex-direction: column;
    }

    .choices {
        margin-left: var(--wordplay-editor-indent);
    }
</style>