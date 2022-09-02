<script lang="ts">
    import type StructureDefinition from "../nodes/StructureDefinition";
    import AliasesView from "./AliasesView.svelte";
    import DocsView from "./DocsView.svelte";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: StructureDefinition;

</script>

<NodeView node={node}>
    <DocsView docs={node.docs}/>
    <span class="definition">
        <span class="signature">
            <TokenView node={node.type}/><AliasesView aliases={node.aliases}/><TokenView node={node.open}/>{#each node.inputs as input }<OptionalNodeView node={input}/>{/each}<TokenView node={node.close}/>
        </span>
    <OptionalNodeView node={node.block}/>
    </span>
</NodeView>