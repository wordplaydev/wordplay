<script lang="ts">
    import Language from "../nodes/Language";
import type TextLiteral from "../nodes/TextLiteral";
import LanguageView from "./LanguageView.svelte";
    import TokenView from "./TokenView.svelte";

    export let node: TextLiteral;

</script>

<div class="node-view">
    <TokenView node={node.text}/>
    <LanguageView node={node.format}/>
</div>