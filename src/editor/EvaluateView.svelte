<script lang="ts">
    import type Evaluate from "../nodes/Evaluate";
    import renderNode from "./renderNode";
    import TokenView from "./TokenView.svelte";
    import TypeVariablesView from "./TypeVariablesView.svelte";

    export let node: Evaluate;

</script>

<div class="node-view">
    <svelte:component this={renderNode(node.func)} node={node.func} />
    <TypeVariablesView typeVars={node.typeVars}/>
    <TokenView node={node.open}/>
    {#each node.inputs as input}<svelte:component this={renderNode(input)} node={input} />{/each}
    <TokenView node={node.close}/>
</div>