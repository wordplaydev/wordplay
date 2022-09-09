<script lang="ts">
    import type Unparsable from "../nodes/Unparsable";
    import NodeView from "./NodeView.svelte";
import OptionalNodeView from "./OptionalNodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Unparsable;

</script>

<NodeView node={node}>
    <span class="tokens">{#each node.parsedNodes as node }<OptionalNodeView node={node} />{/each}{#each node.unparsableTokens as token }<TokenView node={token} />{/each}</span>
</NodeView>

<style>
</style>