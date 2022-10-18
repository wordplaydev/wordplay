<script lang="ts">
    import type Token from "../nodes/Token";
    import { TokenCategories } from "./TokenCategories";

    export let node: Token;

    $: kind = node.types[0] !== undefined ? TokenCategories.get(node.types[0]) : "default";

</script>

{#if node.newlines > 0 ? "newline" : ""}{@html "<br/>".repeat(node.newlines)}{/if}<span 
    class="token-view token-{kind}" 
    style="color: {`var(--token-category-${kind})`}; margin-left: {node.precedingSpaces}ch"
    data-id={node.id}
>
    <span class="text">{ node.text.toString() }</span>
</span>

<style>

    .token-view {
        display: inline-block;
        font-family: var(--wordplay-code-font-face);
        font-size: var(--wordplay-font-size);
        position: relative;
        cursor: text;
        z-index: 1;

        --token-category-delimiter: var(--color-grey);
        --token-category-relation: var(--color-orange);
        --token-category-share: var(--color-orange);
        --token-category-eval: var(--color-blue);
        --token-category-docs: var(--color-purple);
        --token-category-literal: var(--color-blue);
        --token-category-name: var(--color-black);
        --token-category-type: var(--color-orange);
        --token-category-operator: var(--color-orange);
        --token-category-unknown: var(--color-pink);
    }

    .token-view.newline {
        display: block;
    }

    .space {
        visibility: hidden;
    }

    .space.visible {
        visibility: visible;
        color: var(--color-lightgrey);
    }

    .text {
        display: inline-block;
    }

    .text:hover {
        outline: 1px solid var(--color-grey);
    }

    .token-delimiter .text {
        transform-origin: center;
        transform: scale(1.3, 1.3);
    }

</style>