<script lang="ts">
    import type Token from "../nodes/Token";
    import { spaceToHTML, tabToHTML } from "../nodes/Token";
    import TokenType from "../nodes/TokenType";
    import { PLACEHOLDER_SYMBOL } from "../parser/Tokenizer";
    import { getLanguages, getDragged, getProject, getCaret } from "./Contexts";
    import { TokenCategories } from "./TokenCategories";

    export let node: Token;

    function choosePlaceholder() {
        const labels = node.getParent()?.getChildPlaceholderLabel(node, $project.main.getContext());
        if(labels === undefined) return PLACEHOLDER_SYMBOL;
        for(const lang of $languages)
            if(lang in labels) return labels[lang];
        return (labels as Record<string, string>)[""] ?? PLACEHOLDER_SYMBOL;
    }

    $: kind = TokenCategories.get(Array.isArray(node.types) ? node.types[0] ?? "default" : node.types);
    let caret = getCaret();
    let project = getProject();
    let languages = getLanguages();
    let dragged = getDragged();
    $: isPlaceholder = node.is(TokenType.PLACEHOLDER);
    $: showBox = 
        ($caret?.getTokenExcludingWhitespace() === node) || 
        ($caret?.tokenPrior === node && $caret.atBeginningOfToken() && $caret.token && $caret.token.space.length > 0) || 
        isPlaceholder;
    $: textToShow = 
        isPlaceholder ? choosePlaceholder() : 
        node.text.getLength() === 0 ? "\u00A0" : 
        node.text.toString().replaceAll(" ", "&nbsp;");
    $: showSpace = caret !== undefined || $dragged?.getFirstLeaf() !== node;

</script>

<!-- Don't render preceding space if there's no caret -->
{#if showSpace}<span class="space">{@html node.space.replaceAll("\n", "<br/>").replaceAll(" ", spaceToHTML()).replaceAll("\t", tabToHTML())}</span>{/if}<span 
    class="token-view token-{kind} {showBox ? "active" : ""} {isPlaceholder ? "placeholder" : ""} {$caret !== undefined ? "editable" : ""} {`token-category-${kind}`}" 
    
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

    /* Make space visible, but just so. */
    .space {
        color: var(--wordplay-disabled-color);
    }

    .space.visible {
        visibility: visible;
        color: var(--color-lightgrey);
    }

    .text {
        display: inline-block;
    }

    .editable .text:hover, .active .text {
        outline: 1px solid var(--wordplay-border-color);
    }

    .token-delimiter .text {
        transform-origin: center;
        transform: scale(1.3, 1.3);
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
        color: var(--wordplay-error);
        animation: squish .8s cubic-bezier(.36,.07,.19,.97) 1;
    }

</style>