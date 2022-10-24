<script lang="ts">
    import type Bind from "../nodes/Bind";
    import NodeSequenceView from "./NodeSequenceView.svelte";
    import NodeView from "./NodeView.svelte";

    export let node: Bind;

</script>

<NodeSequenceView nodes={node.docs}/><NodeView node={node.etc}/><NodeSequenceView nodes={node.aliases}/><span class="type">{#if node.type}<NodeView node={node.dot}/><NodeView node={node.type}/>{/if}</span><strong><NodeView node={node.colon}/></strong>{#if node.value }<NodeView node={node.value}/>{/if}

<style>
    .type {
        font-style: italic;
        font-size: smaller;
    }
</style>