<script lang="ts">
    import type Unparsable from "../nodes/Unparsable";
import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: Unparsable;

</script>

<NodeView node={node}>
    <span class="tokens">{#each node.lineAfter as token }<TokenView node={token} />{/each}</span>
</NodeView>

<style>
    .tokens {
        border-bottom: 2px solid red;
    }
</style>