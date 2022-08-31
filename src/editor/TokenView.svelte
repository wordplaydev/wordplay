<script lang="ts">
    import type Token from "../nodes/Token";
    import { TokenKinds } from "../nodes/Token";

    export let node: Token;

    const type = node.types[0];
    const kind = type !== undefined ? TokenKinds.get(type) : "default";

</script>

{#if node}
<span class="token-view token-{kind} token-{type}" style="color: {`var(--token-category-${kind})`}">{#if node.space === " "}<span>&nbsp;</span>{/if}{ node.text }</span>
{/if}

<style>

    .token-view {
        padding: var(--wordplay-editor-padding);
        display: inline-block;
        font-family: "Noto Sans Mono", monospace;

        --token-category-delimiter: rgb(180,180,180);
        --token-category-relation: lightGrey;
        --token-category-share: rgb(0,0,180);
        --token-category-eval: rgb(0,0,180);
        --token-category-docs: grey;
        --token-category-literal: green;
        --token-category-name: black;
        --token-category-type: blue;
        --token-category-operator: rgb(0,0,180);
        --token-category-unknown: red;
    }

    .token-view:hover {
        cursor: text;
    }

    .token-delimiter, .token-relation {
        transform-origin: left;
        transform: scale(1.3, 1.3);
    }

</style>