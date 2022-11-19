<script lang="ts">
    import type Unparsable from "../nodes/Unparsable";
    import NodeView from "./NodeView.svelte";

    export let node: Unparsable;

</script>

<span class="tokens">{#each node.parsedNodes as unparsable }<NodeView node={unparsable} />{/each}{#each node.unparsableTokens as token }<NodeView node={token} />{/each}</span>