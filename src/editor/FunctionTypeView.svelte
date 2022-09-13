<script lang="ts">
    import type FunctionType from "../nodes/FunctionType";
    import Token from "../nodes/Token";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: FunctionType;

</script>

<NodeView node={node.fun}/><NodeView node={node.open}/>{#each node.inputs as input}{#if input.rest instanceof Token}<TokenView node={input.rest}/>{/if}<NodeView node={input.type}/>{/each}<NodeView node={node.close}/><NodeView node={node.output}/>