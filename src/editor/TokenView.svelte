<script lang="ts">
    import type Token from "../nodes/Token";
    import { TokenKinds } from "../nodes/Token";

    export let node: Token;

</script>

<div class="token-view" style="color: {`var(--token-category-${TokenKinds.get(node.types[0]) ?? "default"})`}">
    { node.text.trim() }
</div>

<style>

    .token-view {
        padding: var(--wordplay-editor-padding);
        white-space: pre;
        display: inline-block;
        font-family: "Noto Sans", sans-serif;
        font-size: medium;

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

</style>