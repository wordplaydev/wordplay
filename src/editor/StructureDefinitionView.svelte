<script lang="ts">
    import type StructureDefinition from "../nodes/StructureDefinition";
    import AliasesView from "./AliasesView.svelte";
    import DocsView from "./DocsView.svelte";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: StructureDefinition;

</script>

 <div class="node-view">
    <DocsView docs={node.docs}/>
    <TokenView node={node.type}/>
    <AliasesView aliases={node.aliases}/>
    <TokenView node={node.open}/>
    {#each node.inputs as input }<NodeView node={input}/>{/each}
    <TokenView node={node.close}/>
    <NodeView node={node.block}/>
</div>