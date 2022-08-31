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
    <div class="signature">
        <TokenView node={node.type}/><AliasesView aliases={node.aliases}/><TokenView node={node.open}/>{#each node.inputs as input }<NodeView node={input}/>{/each}<TokenView node={node.close}/>
    </div>
    <NodeView node={node.block}/>
</div>

<style>
    .signature {
        display: inline-block;
        border-bottom: 1px solid lightGrey;
    }
</style>