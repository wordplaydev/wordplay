<script lang="ts">
    import type FunctionType from "../nodes/FunctionType";
import Token from "../nodes/Token";
    import NodeView from "./NodeView.svelte";
    import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: FunctionType;

</script>

<NodeView node={node}>
    <TokenView node={node.fun}/><TokenView node={node.open}/>{#each node.inputs as input}{#if input.rest instanceof Token}<TokenView node={input.rest}/>{/if}<OptionalNodeView node={input.type}/>{/each}<TokenView node={node.close}/><OptionalNodeView node={node.output}/>
</NodeView>