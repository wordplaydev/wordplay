<script lang="ts">
    import type TextType from "../nodes/TextType";
    import LanguageView from "./LanguageView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: TextType;

</script>

<div class="node-view">
    <TokenView node={node.quote} />
    <LanguageView node={node.format}/>
</div>