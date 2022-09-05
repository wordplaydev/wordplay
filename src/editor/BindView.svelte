<script lang="ts">
    import type Bind from "../nodes/Bind";
    import AliasesView from "./AliasesView.svelte";
    import DocsView from "./DocsView.svelte";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import OptionalTokenView from "./OptionalTokenView.svelte";

    export let node: Bind;

</script>

<NodeView node={node}>
    <DocsView docs={node.docs}/><OptionalTokenView node={node.etc}/><strong><AliasesView aliases={node.names}/></strong><span class="type">{#if node.type}<OptionalTokenView node={node.dot}/><OptionalNodeView node={node.type}/>{/if}</span><strong><OptionalTokenView node={node.colon}/></strong>{#if node.value }<OptionalNodeView node={node.value}/>{/if}
</NodeView>

<style>
    .type {
        opacity: 0.5;
        font-style: italic;
        font-size: smaller;
    }
</style>