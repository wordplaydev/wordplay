<script lang="ts">
    import type Language from "../nodes/Language";
    import Token from "../nodes/Token";
    import OptionalTokenView from "./OptionalTokenView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: Language;

</script>

<div class="node-view">
    <OptionalTokenView node={node.slash}/>
    {#if node.lang instanceof Token } <TokenView node={node.lang} /> {/if}
</div>