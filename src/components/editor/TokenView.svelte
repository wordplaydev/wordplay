<svelte:options immutable={true} />

<script lang="ts">
    import type Token from '@nodes/Token';
    import TokenType from '@nodes/TokenType';
    import { PLACEHOLDER_SYMBOL } from '@parser/Symbols';
    import { getProject, getCaret, getRoot } from '../project/Contexts';
    import TokenCategories from './TokenCategories';
    import {
        preferredLanguages,
        preferredTranslations,
    } from '@translation/translations';
    import { Languages } from '@translation/LanguageCode';
    import {
        REVERSE_TEXT_DELIMITERS,
        TEXT_DELIMITERS,
    } from '@parser/Tokenizer';
    import Reference from '@nodes/Reference';

    export let node: Token;

    let root = getRoot();

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

    let text: string;
    $: {
        // The text is text.
        text = node.text.toString();

        // Unless it's text, in which case we localize it's delimiters.
        const isText = node.is(TokenType.TEXT);
        const isTextOpen = node.is(TokenType.TEXT_OPEN);
        const isTextClose = node.is(TokenType.TEXT_CLOSE);
        if (
            (isText || isTextOpen || isTextClose) &&
            $preferredLanguages.length > 0
        ) {
            // Is there a closing delimiter? If not, we don't replace it.
            const lastChar = text.at(-1);
            const last =
                text.length > 1 &&
                lastChar !== undefined &&
                lastChar in REVERSE_TEXT_DELIMITERS;
            const preferredQuote =
                Languages[$preferredLanguages[0]].quote ?? '"';
            if (preferredQuote) {
                const preferredClosing = TEXT_DELIMITERS[preferredQuote];
                text = isText
                    ? preferredQuote +
                      text.substring(1, text.length - (last ? 1 : 0)) +
                      (last ? preferredClosing : '')
                    : isTextOpen
                    ? preferredQuote + text.substring(1)
                    : text.substring(0, text.length - (last ? 1 : 0)) +
                      (last ? preferredClosing : '');
            }
        }
    }

    $: {
        // If's a name, localize the name.
        // If the caret is in the node, we choose the name that it is in the source, so that it's editable.
        // Otherwise we choose the best name from of the preferred languages.
        if (node.is(TokenType.NAME) && $caret) {
            // The text is text.
            text = node.text.toString();

            const context = $project
                ? $project.getContext($caret.source)
                : undefined;
            const reference = context ? node.getParent(context) : undefined;
            if (reference instanceof Reference && !$caret.isIn(reference)) {
                const definition = reference.resolve(context);
                if (definition)
                    text = definition.names.getTranslation($preferredLanguages);
            }
        }
    }

    function choosePlaceholder() {
        const context =
            $project !== undefined
                ? $project.getContext($caret?.source ?? $project.main)
                : undefined;
        const labels =
            context !== undefined
                ? $root
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
    style:animation-delay="{Math.random() * 100}ms"
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
        cursor: text;
        animation: bounce 0.5s;
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
