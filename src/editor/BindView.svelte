<script lang="ts">
    import type Bind from "../nodes/Bind";
    import AliasesView from "./AliasesView.svelte";
    import DocsView from "./DocsView.svelte";
    import NodeView from "./NodeView.svelte";
    import OptionalTokenView from "./OptionalTokenView.svelte";

    export let node: Bind;

</script>

<div class="node-view">
    <DocsView docs={node.docs}/>
    <OptionalTokenView node={node.etc}/><AliasesView aliases={node.names}/><OptionalTokenView node={node.dot}/><span class="type">{#if node.type }<NodeView node={node.type}/>{/if}</span><OptionalTokenView node={node.colon}/>{#if node.value }<NodeView node={node.value}/>{/if}
</div>

<style>
    .type {
        opacity: 0.5;
        font-style: italic;
    }

</style>