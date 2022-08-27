<script lang="ts">
    import type Alias from "../nodes/Alias";
    import Token from "../nodes/Token";
    import LanguageView from "./LanguageView.svelte";
    import OptionalTokenView from "./OptionalTokenView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: Alias;

</script>

<div class="node-view">
    <OptionalTokenView node={node.semicolon}/>
    {#if node.name instanceof Token}<TokenView node={node.name} />{/if}
    {#if node.lang } <LanguageView node={node.lang} /> {/if}
</div>