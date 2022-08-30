<script lang="ts">
    import type FunctionDefinition from "../nodes/FunctionDefinition";
    import AliasesView from "./AliasesView.svelte";
    import DocsView from "./DocsView.svelte";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";
    import TypeVariablesView from "./TypeVariablesView.svelte";
    
    export let node: FunctionDefinition;

</script>

 <div class="node-view">
    <DocsView docs={node.docs}/>
    <TokenView node={node.fun}/><AliasesView aliases={node.aliases}/><TypeVariablesView typeVars={node.typeVars}/><TokenView node={node.open}/>{#each node.inputs as input }<svelte:component this={renderNode(input)} node={input} />{/each}<TokenView node={node.close}/>{#if node.dot}<TokenView node={node.dot}/>{/if}{#if node.type}<svelte:component this={renderNode(node.type)} node={node.type} />{/if}<svelte:component this={renderNode(node.expression)} node={node.expression} />
</div>

<style>
</style>