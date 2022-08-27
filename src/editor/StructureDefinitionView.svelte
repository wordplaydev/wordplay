<script lang="ts">
    import type StructureDefinition from "../nodes/StructureDefinition";
import AliasesView from "./AliasesView.svelte";
    import DocsView from "./DocsView.svelte";
    import renderNode from "./renderNode";
import TokenView from "./TokenView.svelte";
    
    export let node: StructureDefinition;

</script>

<!--     
    readonly docs: Docs[];    
    readonly type?: Token;
    readonly aliases: Alias[];
    readonly interfaces: NameType[];
    readonly typeVars: (TypeVariable|Unparsable)[];
    readonly open?: Token;
    readonly inputs: (Bind | Unparsable)[];
    readonly close?: Token;
    readonly block: Block | Unparsable;
 -->

 <div class="node-view">
    <DocsView docs={node.docs}/>
    <TokenView node={node.type}/>
    <AliasesView aliases={node.aliases}/>
    <TokenView node={node.open}/>
    {#each node.inputs as input }<svelte:component this={renderNode(input)} node={input} />{/each}
    <TokenView node={node.close}/>
    <svelte:component this={renderNode(node.block)} node={node.block} />
</div>