<script lang="ts">
    import type Conditional from "../nodes/Conditional";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Conditional;

</script>

<NodeView node={node}>
    <span class="condition"><OptionalNodeView node={node.condition}/><TokenView node={node.conditional}/></span>
    <div class="choices">
        <OptionalNodeView node={node.yes}/>
        <OptionalNodeView node={node.no}/>
    </div>
</NodeView>

<style>
    div {
        display: flex;
        flex-direction: column;
    }

    .choices {
        margin-left: var(--wordplay-editor-indent);
    }
</style>