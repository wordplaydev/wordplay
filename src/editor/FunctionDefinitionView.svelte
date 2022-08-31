<script lang="ts">
    import type FunctionDefinition from "../nodes/FunctionDefinition";
    import AliasesView from "./AliasesView.svelte";
    import DocsView from "./DocsView.svelte";
    import NodeView from "./NodeView.svelte";
    import OptionalTokenView from "./OptionalTokenView.svelte";
    import TokenView from "./TokenView.svelte";
    import TypeVariablesView from "./TypeVariablesView.svelte";
    
    export let node: FunctionDefinition;

</script>

 <div class="node-view">
    <DocsView docs={node.docs}/><TokenView node={node.fun}/><AliasesView aliases={node.aliases}/><TypeVariablesView typeVars={node.typeVars}/><TokenView node={node.open}/>{#each node.inputs as input }<NodeView node={input}/>{/each}<TokenView node={node.close}/><OptionalTokenView node={node.dot}/><NodeView node={node.type}/><NodeView node={node.expression}/>
</div>