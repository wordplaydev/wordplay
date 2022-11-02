<script lang="ts">
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import type Caret from "../models/Caret";
    import type Token from "../nodes/Token";
    import TokenType from "../nodes/TokenType";
    import { PLACEHOLDER_SYMBOL } from "../parser/Tokenizer";
    import { TokenCategories } from "./TokenCategories";

    export let node: Token;

    $: kind = TokenCategories.get(Array.isArray(node.types) ? node.types[0] ?? "default" : node.types);
    $: caret = getContext<Writable<Caret>>("caret");
    $: isPlaceholder = node.is(TokenType.PLACEHOLDER);
    $: showBox = 
        ($caret.getTokenExcludingWhitespace() === node) || 
        ($caret.tokenPrior === node && $caret.atBeginningOfToken() && $caret.token && $caret.token.space.length > 0) || 
        isPlaceholder;
    $: textToShow = 
        isPlaceholder ? node.getParent()?.getChildPlaceholderLabel(node, $caret.source.getContext())?.eng ?? PLACEHOLDER_SYMBOL : 
        node.text.getLength() === 0 ? "\u00A0" : 
        node.text.toString().replaceAll(" ", "&nbsp;")

</script>

{#if node.newlines > 0 ? "newline" : ""}{@html "<br/>".repeat(node.newlines)}{/if}<span 
    class="token-view token-{kind} {showBox ? "active" : ""} {isPlaceholder ? "placeholder" : ""}" 
    style="color: {`var(--token-category-${kind})`}; margin-left: {node.precedingSpaces}ch"
    data-id={node.id}
>
    <span class="text">{@html textToShow }</span>
</span>

<style>

    .token-view {
        display: inline-block;
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

    .text:hover, .active .text {
        outline: 1px solid var(--color-grey);
    }

    .token-delimiter .text {
        transform-origin: center;
        transform: scale(1.3, 1.3);
    }

    .placeholder .text {
        color: var(--wordplay-disabled-color);
    }

</style>