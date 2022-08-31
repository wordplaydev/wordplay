<script lang="ts">
    import type TextType from "../nodes/TextType";
    import LanguageView from "./LanguageView.svelte";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";
    
    export let node: TextType;

</script>

<NodeView node={node}>
    <TokenView node={node.quote} /><LanguageView node={node.format}/>
</NodeView>