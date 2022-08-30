<script lang="ts">
    import type Reaction from "../nodes/Reaction";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";

    export let node: Reaction;

</script>

<div class="node-view">
    <div class="group">
        <svelte:component this={renderNode(node.initial)} node={node.initial} />
        <div>
            <TokenView node={node.delta}/>
            <svelte:component this={renderNode(node.stream)} node={node.stream} />
        </div>
        <svelte:component this={renderNode(node.next)} node={node.next} />
    </div>
</div>

<style>
    .node-view {
        display: flex;
        flex-direction: column;
    }

    .group {
        margin-left: var(--wordplay-editor-indent);
    }
</style>