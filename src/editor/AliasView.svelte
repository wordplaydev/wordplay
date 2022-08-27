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
    <TokenView node={node.name}/>
    <LanguageView node={node.lang}/>
</div>