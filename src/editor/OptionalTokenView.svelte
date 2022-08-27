<script lang="ts">
    import type Token from "../nodes/Token";
    import renderNode from "./renderNode";

    export let node: Token | undefined;

</script>


<span>
    {#if node } <svelte:component this={renderNode(node)} node={node} /> {/if}
</span>