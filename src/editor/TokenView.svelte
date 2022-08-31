<script lang="ts">
    import type Token from "../nodes/Token";
    import { TokenKinds } from "../nodes/Token";

    export let node: Token | undefined;

</script>

{#if node}
<span class="token-view" style="color: {`var(--token-category-${TokenKinds.get(node.types[0]) ?? "default"})`}">{#if node.space.length > 0}<span>&nbsp;</span>{/if}{ node.text }</span>
{/if}

<style>

    .token-view {
        padding: var(--wordplay-editor-padding);
        display: inline;
        font-family: "Noto Sans Mono", monospace;

        --token-category-delimiter: lightGrey;
        --token-category-relation: lightGrey;
        --token-category-share: blue;
        --token-category-eval: magenta;
        --token-category-docs: grey;
        --token-category-literal: green;
        --token-category-name: black;
        --token-category-type: blue;
        --token-category-operator: magenta;
        --token-category-unknown: red;
    }

    .token-view:hover {
        cursor: text;
    }

</style>