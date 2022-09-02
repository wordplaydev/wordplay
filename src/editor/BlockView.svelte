<script lang="ts">
    import type Block from "../nodes/Block";
    import DocsView from "./DocsView.svelte";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";

    export let node: Block;

</script>

<NodeView node={node}>
    <DocsView docs={node.docs}/><OptionalNodeView node={node.open}/>{#each node.statements as statement}<OptionalNodeView node={statement}/>{/each}<OptionalNodeView node={node.close}/>
</NodeView>