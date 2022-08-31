<script lang="ts">
    import type Token from "../nodes/Token";
    import TokenView from "./TokenView.svelte";

    export let node: Token | undefined;

</script>

{#if node }<TokenView node={node} />{/if}
