<script lang="ts">
    import type ConversionDefinition from "../nodes/ConversionDefinition";
    import AliasesView from "./AliasesView.svelte";
    import DocsView from "./DocsView.svelte";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";
    import TypeVariablesView from "./TypeVariablesView.svelte";
    
    export let node: ConversionDefinition;

</script>

 <div class="node-view">
    <DocsView docs={node.docs}/>
    <TokenView node={node.convert}/>
    <svelte:component this={renderNode(node.output)} node={node.output} />
    <svelte:component this={renderNode(node.expression)} node={node.expression} />
</div>