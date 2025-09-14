<script module>
    export type Format = {
        block: boolean;
    };
</script>

<script lang="ts">
    import ValueView from '@components/values/ValueView.svelte';
    import Expression from '@nodes/Expression';
    import type Node from '@nodes/Node';
    import { EVAL_CLOSE_SYMBOL, EVAL_OPEN_SYMBOL } from '@parser/Symbols';
    import { locales } from '../../../db/Database';
    import Token from '../../../nodes/Token';
    import {
        getEvaluation,
        getHidden,
        getHighlights,
        getInsertionPoint,
        getRoot,
        getSpaces,
    } from '../../project/Contexts';
    import getNodeView from './nodeToView';
    import Space from './Space.svelte';

    interface Props {
        node: Node | undefined;
        format: Format;
    }

    let { node, format }: Props = $props();

    const evaluation = getEvaluation();
    const rootContext = getRoot();
    let root = $derived(rootContext?.root);

    let description = $derived(
        node && $evaluation
            ? node
                  .getDescription(
                      $locales,
                      $evaluation.evaluator.project.getNodeContext(node),
                  )
                  .toText()
            : null,
    );

    // Show a value if 1) it's an expression, 2) the evaluator is stepping, 3) it's not involved in the evaluation stack
    // and 4) the node's evaluation is currently evaluating. Start by assuming there isn't a value.
    // Note that this interacts with Editor.handleEdit(), which adjust caret positions if a value is rendered.
    let value = $derived(
        $evaluation &&
            !$evaluation.playing &&
            node instanceof Expression &&
            !node.isEvaluationInvolved()
            ? $evaluation.evaluator.getLatestExpressionValue(node)
            : undefined,
    );

    // Get the root's computed spaces store
    let spaces = getSpaces();
    // See if this node has any space to render.
    let firstToken = $derived(node?.getFirstLeaf());
    let spaceRoot = $derived(
        root && node ? root.getSpaceRoot(node) : undefined,
    );
    let space = $derived(
        firstToken ? ($spaces?.getSpace(firstToken) ?? '') : '',
    );

    // Get the hidden context.
    let hidden = getHidden();
    let hide = $derived(node ? $hidden?.has(node) : false);

    // Get the insertion point
    let insertion = getInsertionPoint();

    // Get the highlights
    let highlights = getHighlights();
    let highlight = $derived(node ? $highlights?.get(node) : undefined);

    // Get the Svelte component with which to render this node.
    let view = $derived(node ? getNodeView(node) : undefined);
    let ComponentView = $derived(view ? view.component : undefined);
    let style = $derived(view ? view.style : undefined);
</script>

<!-- Don't render anything if we weren't given a node. -->
{#if node !== undefined && ComponentView !== undefined}
    <!-- Render space preceding this node if not hidden, if there's a first token, and this node is the root of the preceding space. -->
    {#if !hide && firstToken && spaceRoot === node}
        {#if !format.block}
            <Space
                token={firstToken}
                first={$spaces.isFirst(firstToken)}
                line={$spaces.getLineNumber(firstToken)}
                {space}
                insertion={$insertion?.token === firstToken
                    ? $insertion
                    : undefined}
            />
        {/if}
    {/if}<!-- Render the node view wrapper, but no extra whitespace! --><div
        class={[
            'node-view',
            node.getDescriptor(),
            ...(highlight ? highlight.values() : []),
            {
                block: format.block,
                hide,
                inline: style?.direction === 'inline',
                Token: node instanceof Token,
                highlighted: highlight,
            },
            style?.kind,
        ]}
        data-uiid={node.getDescriptor()}
        data-id={node.id}
        id={`node-${node.id}`}
        aria-hidden={hide ? 'true' : null}
        aria-label={description}
        ><!--Render the value if there's a value to render, or the node view otherwise -->
        {#if value && node.isUndelimited()}<span class="eval"
                >{EVAL_OPEN_SYMBOL}</span
            >{/if}<ComponentView
            {node}
            {format}
        />{#if value}{#if node.isUndelimited()}<span class="eval"
                    >{EVAL_CLOSE_SYMBOL}</span
                >{/if}<div class="value"
                ><ValueView {value} {node} interactive /></div
            >{/if}
    </div>
{/if}

<style>
    .node-view {
        display: inline;
        position: relative;
        border-radius: var(--wordplay-editor-radius);
        padding: 0;
        transition-property: background-color, padding, border-color;
        transition-duration: calc(var(--animation-factor) * 200ms);
        transition-timing-function: ease-out;
        border-color: transparent;

        /** This allows us to style things up the the tree. */
        text-decoration: inherit;
    }

    .value {
        display: inline-block;
        /* margin-inline-start: var(--wordplay-spacing); */
        transform: translateY(var(--wordplay-spacing-half));
    }

    .blockselected {
        outline: var(--wordplay-focus-width) solid
            var(--wordplay-highlight-color);
        background: var(--wordplay-hover);
    }

    /* When beginning dragged in an editor, hide the node view contents to create a sense of spatial integrity. */
    .dragged :global(.token-view) {
        opacity: 0.25;
    }

    .dragged,
    .dragged :global(.node-view) {
        border: none;
        cursor: grabbing;
    }

    .dragged :global(.node-view) {
        background: none;
    }

    .hide {
        display: inline-block;
        width: 0;
        height: 0;
        overflow: hidden;
    }

    .small {
        font-size: 80%;
    }

    .Block {
        min-height: var(--wordplay-min-line-height) !important;
    }

    .break {
        display: block;
        width: 1em;
        height: var(--wordplay-min-line-height);
    }

    .space {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-border-width);
        position: relative;
        color: var(--wordplay-inactive-color);
    }

    .eval {
        color: var(--wordplay-evaluation-color);
    }

    .block {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        align-items: start;
        width: fit-content;
        height: fit-content;

        padding: var(--wordplay-spacing-half) calc(var(--wordplay-spacing-half))
            var(--wordplay-spacing-half) calc(var(--wordplay-spacing-half));
        box-shadow: var(--color-shadow) 0px 0px 4px;
        border-radius: var(--wordplay-border-radius);

        animation: calc(var(--animation-factor) * 200ms) ease-out 0s 1 entry;
    }

    /** An empty block has different padding */
    .block:empty {
        padding: var(--wordplay-spacing-half);
        align-self: center;
    }

    @keyframes entry {
        0% {
            transform: scale(1);
        }
        40% {
            transform: scale(1.02);
        }
        70% {
            transform: scale(0.99);
        }
        100% {
            transform: scale(1);
        }
    }

    .block.inline {
        flex-direction: row;
        align-items: baseline;
        gap: var(--wordplay-spacing-half);
    }

    .block.definition {
        border-inline-start: var(--wordplay-focus-width) solid var(--color-blue);
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
    }

    .block.evaluate {
        border-block-end: var(--wordplay-focus-width) solid var(--color-purple);
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    .block.type {
        font-size: var(--wordplay-small-font-size);
        box-shadow: inset var(--color-shadow) 0px 0px
            var(--wordplay-focus-width);
        background: var(--color-shadow-transparent);
    }

    .block.predicate {
        border-inline-start: var(--wordplay-focus-width) solid var(--color-pink);
        border-radius: 0;
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
    }

    .block.data {
        box-shadow: inset var(--color-shadow) 0px 0px
            var(--wordplay-focus-width);
        border: dashed var(--wordplay-border-width) var(--wordplay-border-color);
        border-radius: 0;
    }

    .block.none {
        padding: 0;
        box-shadow: none;
    }

    .small {
        font-size: var(--wordplay-small-font-size);
    }
</style>
