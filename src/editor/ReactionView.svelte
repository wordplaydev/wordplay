<script lang="ts">
    import type Reaction from "../nodes/Reaction";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Reaction;

</script>

<NodeView node={node} block>
    <div class="group">
        <OptionalNodeView node={node.initial}/>
        <div>
            <TokenView node={node.delta}/>
            <OptionalNodeView node={node.stream}/>
        </div>
        <OptionalNodeView node={node.next}/>
    </div>
</NodeView>

<style>
    .group {
        margin-left: var(--wordplay-editor-indent);
    }
</style>