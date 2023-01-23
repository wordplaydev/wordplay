<svelte:options immutable={true} />

<script lang="ts">
    import type Token from '../nodes/Token';
    import TokenType from '../nodes/TokenType';
    import { PLACEHOLDER_SYMBOL } from '../parser/Symbols';
    import { getProject, getCaret } from './util/Contexts';
    import TokenCategories from './TokenCategories';
    import {
        preferredLanguages,
        preferredTranslations,
    } from '../translation/translations';
    import { Languages } from '../translation/LanguageCode';
    import { TEXT_DELIMITERS } from '../parser/Tokenizer';

    export let node: Token;

    function choosePlaceholder() {
        const source = $caret?.source;
        const context =
            source !== undefined ? $project.getContext(source) : undefined;
        const labels =
            context !== undefined
                ? source
                      ?.get(node)
                      ?.getParent()
                      ?.getChildPlaceholderLabel(
                          node,
                          $preferredTranslations[0],
                          context
                      )
                : undefined;
        return labels ?? PLACEHOLDER_SYMBOL;
    }

    $: kind = TokenCategories.get(
        Array.isArray(node.types) ? node.types[0] ?? 'default' : node.types
    );
    let caret = getCaret();
    let project = getProject();

    $: placeholder = node.is(TokenType.PLACEHOLDER);
    $: active =
        $caret?.getTokenExcludingSpace() === node ||
        ($caret?.tokenPrior === node &&
            $caret.atBeginningOfToken() &&
            $caret.token &&
            $caret.tokenAtHasPrecedingSpace());

    // Get the text from the token and if it's text, localize it's delimiters.
    $: text = node.text.toString();
    $: {
        const isText = node.is(TokenType.TEXT);
        const isTextOpen = node.is(TokenType.TEXT_OPEN);
        const isTextClose = node.is(TokenType.TEXT_CLOSE);
        if (
            $preferredLanguages.length > 0 &&
            (isText || isTextOpen || isTextClose)
        ) {
            const preferredQuote =
                Languages[$preferredLanguages[0]].quote ?? '"';
            if (preferredQuote) {
                const preferredClosing = TEXT_DELIMITERS[preferredQuote];
                text = isText
                    ? preferredQuote +
                      text.substring(1, text.length - 1) +
                      preferredClosing
                    : isTextOpen
                    ? preferredQuote + text.substring(1)
                    : text.substring(0, text.length - 1) + preferredClosing;
            }
        }
    }

    $: textToShow = placeholder
        ? choosePlaceholder()
        : node.text.getLength() === 0
        ? '\u200B'
        : text
              // If there happen to be spaces in the text, render them with a non-breaking space.
              .replaceAll(' ', '&nbsp;');
</script>

<span
    class="token-view {`token-category-${kind}`} {node.is(
        TokenType.NAME_SEPARATOR
    )
        ? 'comma'
        : ''} {$caret !== undefined ? 'editable' : ''}"
    class:active
    class:placeholder
    data-id={node.id}
    ><span class="text"
        >{#if placeholder}{choosePlaceholder()}{:else if text.length === 0}&ZeroWidthSpace;{:else}{text.replaceAll(
                ' ',
                '\xa0'
            )}{/if}</span
    ></span
>

<style>
    .token-view {
        display: inline-block;
        position: relative;
    }

    .token-category-delimiter {
        color: var(--color-grey);
    }
    .token-category-relation {
        color: var(--wordplay-relation-color);
    }
    .token-category-share {
        color: var(--color-orange);
    }
    .token-category-eval {
        color: var(--color-blue);
    }
    .token-category-docs {
        color: var(--wordplay-doc-color);
    }
    .token-category-literal {
        color: var(--color-blue);
    }
    .token-category-name {
        color: var(--color-black);
    }
    .token-category-type {
        color: var(--wordplay-type-color);
    }
    .token-category-operator {
        color: var(--wordplay-operator-color);
    }
    .token-category-unknown {
        color: var(--color-pink);
    }
    .token-category-placeholder {
        color: var(--wordplay-disabled-color);
    }

    .token-view.newline {
        display: block;
    }

    .text {
        display: inline-block;
    }

    .editable .text:hover,
    .active .text {
        outline: 1px solid var(--wordplay-border-color);
    }

    .placeholder .text {
        font-family: var(--wordplay-app-font);
        font-style: italic;
    }
</style>
