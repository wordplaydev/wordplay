<script lang="ts">
    import type TextLiteral from "../nodes/TextLiteral";
    import LanguageView from "./LanguageView.svelte";
    import NodeView from "./NodeView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: TextLiteral;

</script>

<NodeView node={node}>
    <TokenView node={node.text}/><LanguageView node={node.format}/>
</NodeView>