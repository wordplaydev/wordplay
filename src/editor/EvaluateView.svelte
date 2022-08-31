<script lang="ts">
    import type Evaluate from "../nodes/Evaluate";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";
    import TypeVariablesView from "./TypeVariablesView.svelte";

    export let node: Evaluate;

</script>

<NodeView node={node}>
    <OptionalNodeView node={node.func}/><TypeVariablesView typeVars={node.typeVars}/><TokenView node={node.open}/>{#each node.inputs as input}<OptionalNodeView node={input}/>{/each}<TokenView node={node.close}/>
</NodeView>