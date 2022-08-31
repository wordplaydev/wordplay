<script lang="ts">
    import type Conditional from "../nodes/Conditional";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Conditional;

</script>

<div class="node-view">
    <span><NodeView node={node.condition}/><TokenView node={node.conditional}/></span>
    <div class="choices">
        <NodeView node={node.yes}/>
        <NodeView node={node.no}/>
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