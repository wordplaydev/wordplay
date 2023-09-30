<svelte:options immutable={true} />

<script lang="ts">
    import type Token from '@nodes/Token';
    import {
        getProject,
        getCaret,
        getRoot,
        getHidden,
    } from '../project/Contexts';
    import TokenCategories from './TokenCategories';
    import { locale, locales } from '../../db/Database';

    export let node: Token;

    let caret = getCaret();
    let project = getProject();
    let root = getRoot();

    $: context =
        $root === undefined || $project === undefined
            ? undefined
            : $project.getNodeContext($root.root);

    // See if this is a placeholder that should be rendered differently.
    $: placeholder =
        $project && $root && context
            ? node.getPlaceholder($root, context, $locale)
            : undefined;

    // True if the caret is "on" this token.
    $: active =
        node.getTextLength() > 0 &&
        ($caret?.getTokenExcludingSpace() === node ||
            ($caret?.tokenPrior === node &&
                $caret.atBeginningOfTokenSpace() &&
                $caret.tokenIncludingSpace &&
                $caret.tokenAtHasPrecedingSpace()));

    // True if this is the recently added token.
    $: added = $caret?.addition?.contains(node) ?? false;

    // Localize the token's text using the preferred translation.
    // Don't localize the name if the caret is in the name.
    $: text =
        context === undefined || $root === undefined
            ? node.getText()
            : node.localized(
                  $caret === undefined || !$caret.isIn(node, true),
                  $locales,
                  $root,
                  context
              );

    let hidden = getHidden();
    $: hide = node ? $hidden?.has(node) : false;
</script>

<span
    class="token-view token-category-{TokenCategories.get(
        Array.isArray(node.types) ? node.types[0] ?? 'default' : node.types
    )}"
    class:hide
    class:active
    class:editable={$caret !== undefined}
    class:placeholder={placeholder !== undefined}
    class:added
    data-id={node.id}
    role="presentation"
    >{#if placeholder !== undefined}<span class="placeholder"
            >{placeholder}</span
        >{:else if text.length === 0}&ZeroWidthSpace;{:else}{text.replaceAll(
            ' ',
            '\xa0'
        )}{/if}</span
>

<style>
    .token-view {
        display: inline-block;
        position: relative;
        font-family: var(--wordplay-code-font);

        /** This allows us to style things up the the tree. */
        text-decoration: inherit;
    }

    .hide {
        width: 0;
        height: 0;
        overflow: hidden;
    }

    .token-view.added {
        animation: ybounce;
        animation-duration: calc(var(--animation-factor) * 500ms);
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
        color: var(--wordplay-inactive-color);
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
        font-size: small;
        text-decoration: underline;
    }
</style>
