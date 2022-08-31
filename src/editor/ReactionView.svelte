<script lang="ts">
    import type Reaction from "../nodes/Reaction";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Reaction;

</script>

<div class="node-view">
    <div class="group">
        <NodeView node={node.initial}/>
        <div>
            <TokenView node={node.delta}/>
            <NodeView node={node.stream}/>
        </div>
        <NodeView node={node.next}/>
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