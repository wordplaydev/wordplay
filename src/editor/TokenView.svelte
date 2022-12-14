<svelte:options immutable={true}/>

<script lang="ts">
    import type Token from "../nodes/Token";
    import TokenType from "../nodes/TokenType";
    import { PLACEHOLDER_SYMBOL } from "../parser/Tokenizer";
    import { getProject, getCaret } from "./util/Contexts";
    import TokenCategories from "./TokenCategories";
    import { languages } from "../models/languages";

    export let node: Token;

    function choosePlaceholder() {
        const source = $caret?.source;
        const context = source !== undefined ? $project.getContext(source) : undefined;
        const labels = context !== undefined ? source?.get(node)?.getParent()?.getChildPlaceholderLabel(node, context) : undefined;
        if(labels === undefined) return PLACEHOLDER_SYMBOL;
        for(const lang of $languages)
            if(lang in labels) return labels[lang];
        return (labels as Record<string, string>)[""] ?? PLACEHOLDER_SYMBOL;
    }

    $: kind = TokenCategories.get(Array.isArray(node.types) ? node.types[0] ?? "default" : node.types);
    let caret = getCaret();
    let project = getProject();

    $: isPlaceholder = node.is(TokenType.PLACEHOLDER);
    $: showBox = 
        ($caret?.getTokenExcludingWhitespace() === node) || 
        ($caret?.tokenPrior === node && $caret.atBeginningOfToken() && $caret.token && $caret.tokenAtHasPrecedingSpace()) || 
        isPlaceholder;
    $: textToShow = 
        isPlaceholder ? choosePlaceholder() : 
        node.text.getLength() === 0 ? "\u00A0" : 
        node.text.toString().replaceAll(" ", "&nbsp;");
    
</script>

<span class="token-view token-{kind} {node.is(TokenType.NAME_SEPARATOR) ? "comma" : ""} {showBox ? "active" : ""} {isPlaceholder ? "placeholder" : ""} {$caret !== undefined ? "editable" : ""} {`token-category-${kind}`}" data-id={node.id}><span class="text">{@html textToShow }</span></span>

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

    .text {
        display: inline-block;
    }

    .editable .text:hover, .active .text {
        outline: 1px solid var(--wordplay-border-color);
    }

    .placeholder .text {
        font-family: var(--wordplay-font-face);
        color: var(--wordplay-disabled-color);
        background-color: var(--color-white);
        padding: 2px;
    }

    :global(.exception) .text {
        display: inline-block;
        white-space: nowrap;
        animation: squish .8s cubic-bezier(.36,.07,.19,.97) infinite;
    }

</style>