<script lang="ts">
    import type Evaluate from "../nodes/Evaluate";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";
    import TypeVariablesView from "./TypeVariablesView.svelte";

    export let node: Evaluate;

</script>

<div class="node-view">
    <NodeView node={node.func}/><TypeVariablesView typeVars={node.typeVars}/><TokenView node={node.open}/>{#each node.inputs as input}<NodeView node={input}/>{/each}<TokenView node={node.close}/>
</div>