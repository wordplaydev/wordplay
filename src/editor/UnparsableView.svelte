<script lang="ts">
    import type Unparsable from "../nodes/Unparsable";
    import TokenView from "./TokenView.svelte";

    export let node: Unparsable;

</script>

<div class="node-view">
    {#each node.lineAfter as token }
        <TokenView node={token} />
    {/each}
</div>

<style>
    div {
        border-bottom: 2px solid red;
    }
</style>