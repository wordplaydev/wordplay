<script lang="ts">
    import { getContext } from "svelte";
    import type Token from "../nodes/Token";
    import TokenType from "../nodes/TokenType";
    import { PLACEHOLDER_SYMBOL } from "../parser/Tokenizer";
    import { CaretSymbol, ProjectSymbol, type CaretContext, type ProjectContext } from "./Contexts";
    import { TokenCategories } from "./TokenCategories";

    export let node: Token;

    $: kind = TokenCategories.get(Array.isArray(node.types) ? node.types[0] ?? "default" : node.types);
    let caret = getContext<CaretContext>(CaretSymbol);
    let project = getContext<ProjectContext>(ProjectSymbol);
    $: isPlaceholder = node.is(TokenType.PLACEHOLDER);
    $: showBox = 
        ($caret?.getTokenExcludingWhitespace() === node) || 
        ($caret?.tokenPrior === node && $caret.atBeginningOfToken() && $caret.token && $caret.token.space.length > 0) || 
        isPlaceholder;
    $: textToShow = 
        isPlaceholder ? node.getParent()?.getChildPlaceholderLabel(node, $project.main.getContext())?.eng ?? PLACEHOLDER_SYMBOL : 
        node.text.getLength() === 0 ? "\u00A0" : 
        node.text.toString().replaceAll(" ", "&nbsp;")

</script>

{#if node.newlines > 0 ? "newline" : ""}{@html "<br/>".repeat(node.newlines)}{/if}<span 
    class="token-view token-{kind} {showBox ? "active" : ""} {isPlaceholder ? "placeholder" : ""} {$caret !== undefined ? "editable" : ""} {`token-category-${kind}`}" 
    style="margin-left: {node.precedingSpaces}ch"
    data-id={node.id}
>
    <span class="text">{@html textToShow }</span>
</span>

<style>

    .token-view {
        display: inline-block;
        position: relative;
        z-index: 1;
    }

    .token-category-delimiter { color: var(--color-grey); }
    .token-category-relation { color: var(--color-orange); }
    .token-category-share { color: var(--color-orange); }
    .token-category-eval { color: var(--color-blue); }
    .token-category-docs { color: var(--color-purple); }
    .token-category-literal { color: var(--color-blue); }
    .token-category-name { color: var(--color-black); }
    .token-category-type { color: var(--color-orange); }
    .token-category-operator { color: var(--color-orange); }
    .token-category-unknown { color: var(--color-pink); }

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

    .editable .text:hover, .active .text {
        outline: 1px solid var(--color-grey);
    }

    .token-delimiter .text {
        transform-origin: center;
        transform: scale(1.3, 1.3);
    }

    .placeholder .text {
        color: var(--wordplay-disabled-color);
        background-color: var(--color-white);
    }

</style>