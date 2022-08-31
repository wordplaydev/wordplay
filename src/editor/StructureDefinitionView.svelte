<script lang="ts">
    import type StructureDefinition from "../nodes/StructureDefinition";
    import AliasesView from "./AliasesView.svelte";
    import DocsView from "./DocsView.svelte";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: StructureDefinition;

</script>

<NodeView node={node} block>
    <DocsView docs={node.docs}/>
    <div class="definition">
        <div class="signature">
            <TokenView node={node.type}/><AliasesView aliases={node.aliases}/><TokenView node={node.open}/>{#each node.inputs as input }<OptionalNodeView node={input}/>{/each}<TokenView node={node.close}/>
        </div>
    <OptionalNodeView node={node.block}/>
    </div>
</NodeView>

<style>
    .definition {
        border-left: 2px solid var(--color-grey);
        padding-left: var(--wordplay-editor-padding);
    }
</style>