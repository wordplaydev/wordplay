<svelte:options immutable={true} />

<script lang="ts">
    import type Token from '@nodes/Token';
    import TokenType from '@nodes/TokenType';
    import { getProject, getCaret, getRoot } from '../project/Contexts';
    import TokenCategories from './TokenCategories';
    import { preferredTranslations } from '@translation/translations';
    import { Languages } from '@translation/LanguageCode';
    import {
        REVERSE_TEXT_DELIMITERS,
        TEXT_DELIMITERS,
    } from '@parser/Tokenizer';
    import Reference from '@nodes/Reference';
    import Evaluate from '@nodes/Evaluate';
    import type Definition from '@nodes/Definition';

    export let node: Token;

    $: kind = TokenCategories.get(
        Array.isArray(node.types) ? node.types[0] ?? 'default' : node.types
    );
    let caret = getCaret();
    let project = getProject();
    let root = getRoot();

    $: placeholder =
        $project && $root
            ? node.getPlaceholder($root, $project, $preferredTranslations[0])
            : undefined;
    $: active =
        node.getTextLength() > 0 &&
        ($caret?.getTokenExcludingSpace() === node ||
            ($caret?.tokenPrior === node &&
                $caret.atBeginningOfTokenSpace() &&
                $caret.tokenIncludingSpace &&
                $caret.tokenAtHasPrecedingSpace()));
    $: added = $caret?.addition?.contains(node) ?? false;

    let text: string;
    $: {
        // The text is text.
        text = node.text.toString();

        // Unless it's text, in which case we localize it's delimiters.
        const isText = node.is(TokenType.Text);
        const isTextOpen = node.is(TokenType.TemplateOpen);
        const isTextClose = node.is(TokenType.TemplateClose);
        if (
            (isText || isTextOpen || isTextClose) &&
            $preferredTranslations.length > 0
        ) {
            // Is there a closing delimiter? If not, we don't replace it.
            const lastChar = text.at(-1);
            const last =
                text.length > 1 &&
                lastChar !== undefined &&
                lastChar in REVERSE_TEXT_DELIMITERS;
            const preferredQuote =
                Languages[$preferredTranslations[0].language].quote;
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

    // If this token is a name, localize the name.
    // If the caret is in the node, we choose the name that it is in the source, so that it's editable.
    // Otherwise we choose the best name from of the preferred languages.
    $: {
        if (node.is(TokenType.Name) && $caret) {
            // The text is text.
            text = node.text.toString();

            const context = $project
                ? $project.getContext($caret.source)
                : undefined;
            const parent = context ? node.getParent(context) : undefined;
            let def: Definition | undefined = undefined;
            if (parent && context && !$caret.isIn(parent)) {
                // Is this in a reference
                if (parent instanceof Reference) {
                    const definition = parent.resolve(context);
                    if (definition) def = definition;
                } else {
                    // Is this an evaluation bind? Find the corresponding input to get its names.
                    const evaluate = context.source.root
                        .getAncestors(parent)
                        .filter((n): n is Evaluate => n instanceof Evaluate)[0];
                    if (evaluate) {
                        const fun = evaluate.getFunction(context);
                        if (fun)
                            def = fun.inputs.find((input) =>
                                input.hasName(text)
                            );
                    }
                }
            }

            if (def) {
                text =
                    def.names.getEmojiName() ??
                    def.names.getTranslation(
                        $preferredTranslations.map((t) => t.language)
                    );
            }
        }
    }
</script>

<span
    role="presentation"
    class="token-view token-category-{kind}"
    class:active
    class:editable={$caret !== undefined}
    class:placeholder
    class:added
    data-id={node.id}
    >{#if typeof placeholder === 'string'}{placeholder}{:else if text.length === 0}&ZeroWidthSpace;{:else}{text.replaceAll(
            ' ',
            '\xa0'
        )}{/if}</span
>

<style>
    .token-view {
        display: inline-block;
        position: relative;
    }

    :global(.animated) .token-view.added {
        animation: bounce;
        animation-duration: 500ms;
        animation-delay: 100ms;
    }

    :global(.hide) .token-view {
        width: 0;
        height: 0;
    }

    .token-view.editable {
        cursor: text;
    }

    .token-category-delimiter {
        color: var(--color-dark-grey);
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
        color: var(--wordplay-foreground);
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

    .editable:hover,
    .active {
        outline: 1px solid var(--wordplay-border-color);
    }

    .placeholder {
        font-family: var(--wordplay-app-font);
        font-style: italic;
    }
</style>
