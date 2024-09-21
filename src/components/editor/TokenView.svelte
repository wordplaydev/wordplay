<svelte:options immutable={true} />

<script lang="ts">
    import Token from '@nodes/Token';
    import {
        getProject,
        getCaret,
        getRoot,
        getHidden,
        getLocalize,
        isBlocks,
    } from '../project/Contexts';
    import TokenCategories from './TokenCategories';
    import { locales } from '../../db/Database';
    import { withVariationSelector } from '../../unicode/emoji';
    import Sym from '@nodes/Sym';
    import Name from '@nodes/Name';
    import Reference from '@nodes/Reference';
    import UnaryEvaluate from '@nodes/UnaryEvaluate';
    import BinaryEvaluate from '@nodes/BinaryEvaluate';
    import OperatorEditor from './OperatorEditor.svelte';
    import NameTokenEditor from './NameTokenEditor.svelte';
    import ReferenceTokenEditor from './ReferenceTokenEditor.svelte';
    import WordsTokenEditor from './WordsTokenEditor.svelte';
    import NumberTokenEditor from './NumberTokenEditor.svelte';
    import BooleanTokenEditor from './BooleanTokenEditor.svelte';

    export let node: Token;

    let caret = getCaret();
    let project = getProject();
    let root = getRoot();
    let localize = getLocalize();
    let hidden = getHidden();
    let blocks = isBlocks();

    $: hide = node ? $hidden?.has(node) : false;
    $: editable = $caret !== undefined;

    $: context =
        $root === undefined || $project === undefined
            ? undefined
            : $project.getNodeContext($root.root);

    // See if this is a placeholder that should be rendered differently.
    $: placeholder =
        $project && $root && context
            ? node.getPlaceholder($root, context, $locales)
            : undefined;

    $: isInCaret =
        $caret &&
        node.getTextLength() > 0 &&
        ($caret.getTokenExcludingSpace() === node ||
            ($caret.tokenPrior === node && $caret.atBeginningOfTokenSpace()));

    // True if the caret is "on" this token.
    $: active =
        $caret &&
        node.getTextLength() > 0 &&
        ($caret.getTokenExcludingSpace() === node ||
            ($caret.tokenPrior === node &&
                $caret.atBeginningOfTokenSpace() &&
                $caret.tokenIncludingSpace &&
                $caret.tokenAtHasPrecedingSpace()));

    // True if this is the recently added token.
    $: added = $caret?.addition?.contains(node) ?? false;

    // If requesed, localize the token's text.
    // Don't localize the name if the caret is in the name.
    $: text =
        !isInCaret && context && $root && localize && $localize !== 'actual'
            ? node.localized(
                  $localize === 'symbolic',
                  $locales.getLocales(),
                  $root,
                  context,
              )
            : node.getText();

    // Prepare the text for rendering by replacing spaces with non-breaking spaces
    // and adding variation selectors after emoji to guarantee the correct emoji font is chosen.
    $: renderedText =
        node.isSymbol(Sym.Name) ||
        node.isSymbol(Sym.Text) ||
        node.isSymbol(Sym.Words)
            ? withVariationSelector(text.replaceAll(' ', '\xa0'))
            : text.replaceAll(' ', '\xa0');
</script>

{#if $blocks && $root}
    <div
        class="token-view blocks token-category-{TokenCategories.get(
            Array.isArray(node.types) ? node.types[0] ?? 'default' : node.types,
        )}"
        class:hide
        class:active
        class:editable
        class:added
        data-id={node.id}
    >
        {#if editable && $project && context && (node.isSymbol(Sym.Name) || node.isSymbol(Sym.Operator) || node.isSymbol(Sym.Words) || node.isSymbol(Sym.Number) || node.isSymbol(Sym.Boolean))}
            {#if node.isSymbol(Sym.Words)}<WordsTokenEditor
                    words={node}
                    {text}
                    project={$project}
                    placeholder={placeholder ?? ''}
                />
            {:else if node.isSymbol(Sym.Boolean)}<BooleanTokenEditor
                    {node}
                    project={$project}
                />
            {:else if node.isSymbol(Sym.Number)}<NumberTokenEditor
                    number={node}
                    {text}
                    project={$project}
                    placeholder={placeholder ?? ''}
                />{:else}
                {@const parent = $root.getParent(node)}
                <!-- Names can be any text that parses as a name -->
                {#if parent instanceof Name}
                    <NameTokenEditor
                        {text}
                        project={$project}
                        name={parent.name}
                        placeholder={placeholder ?? ''}
                    />
                {:else if parent instanceof Reference}
                    {@const grandparent = $root.getParent(parent)}
                    <!-- Is this token an operator of a binary or unary evaluate? Show valid operators. -->
                    {#if grandparent && (grandparent instanceof BinaryEvaluate || grandparent instanceof UnaryEvaluate) && grandparent.fun === parent}
                        <OperatorEditor evaluate={grandparent} />
                    {:else}
                        <ReferenceTokenEditor reference={parent}
                        ></ReferenceTokenEditor>
                    {/if}
                {:else}{renderedText}{/if}
            {/if}
        {:else}
            {renderedText}
        {/if}
    </div>
{:else}
    <span
        class="token-view text token-category-{TokenCategories.get(
            Array.isArray(node.types) ? node.types[0] ?? 'default' : node.types,
        )}"
        class:hide
        class:active
        class:editable
        class:placeholder={placeholder !== undefined}
        class:added
        data-id={node.id}
        role="presentation"
    >
        {#if placeholder !== undefined}<span class="placeholder"
                >{placeholder}</span
            >{:else if text.length === 0}&ZeroWidthSpace;{:else}{renderedText}{/if}
    </span>
{/if}

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

    :global(.dragging) .token-view.editable {
        cursor: grabbing;
    }

    /* Give all tokens in side a .Doc the doc color except those inside an .Example */
    :global(.Doc) .token-view {
        color: var(--wordplay-doc-color);
    }

    .token-category-delimiter,
    :global(.Example) .token-category-delimiter {
        color: var(--color-dark-grey);
    }
    .token-category-relation,
    :global(.Example) .token-category-relation {
        color: var(--wordplay-relation-color);
    }
    .token-category-share,
    :global(.Example) .token-category-share {
        color: var(--color-orange);
    }
    .token-category-eval,
    :global(.Example) .token-category-eval {
        color: var(--color-blue);
    }

    .token-category-name,
    :global(.Example) .token-category-name {
        color: var(--wordplay-foreground);
    }

    .token-category-type,
    :global(.Example) .token-category-type {
        color: var(--wordplay-type-color);
    }
    .token-category-operator,
    :global(.Example) .token-category-operator {
        color: var(--wordplay-operator-color);
    }
    .token-category-unknown,
    :global(.Example) .token-category-unknown {
        color: var(--color-pink);
    }
    .token-category-placeholder,
    :global(.Example) .token-category-placeholder {
        color: var(--wordplay-inactive-color);
    }

    .token-category-literal,
    :global(.Example) .token-category-literal {
        color: var(--color-blue);
    }

    .token-view.newline {
        display: block;
    }

    .text.editable:hover,
    .active {
        outline: 1px solid var(--wordplay-border-color);
    }

    .placeholder {
        font-family: var(--wordplay-app-font);
        font-style: italic;
        font-size: var(--wordplay-font-size);
        text-decoration: underline;
    }
</style>
