<script lang="ts">
    import type Node from '@nodes/Node';
    import {
        getEvaluation,
        getHidden,
        getInsertionPoint,
        getRoot,
        getSpaces,
        getIsBlocks,
        getHighlights,
    } from '../project/Contexts';
    import getNodeView from './util/nodeToView';
    import Expression, { ExpressionKind } from '@nodes/Expression';
    import ValueView from '@components/values/ValueView.svelte';
    import Space from './Space.svelte';
    import Token from '../../nodes/Token';
    import { locales } from '../../db/Database';
    import InsertionPointView from './InsertionPointView.svelte';
    import Block from '@nodes/Block';

    interface Props {
        node: Node | undefined;
        small?: boolean;
        direction?: 'row' | 'column';
    }

    let { node, small = false, direction = 'row' }: Props = $props();

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

    const blocks = getIsBlocks();

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

    let kind = $derived(
        $blocks && node instanceof Expression ? node.getKind() : undefined,
    );

    // Get the Svelte component with which to render this node.
    let NodeView = $derived(node ? getNodeView(node) : undefined);

    function symbolOccurs(text: string, symbol: string) {
        for (let i = 0; i < text.length; i++)
            if (text.charAt(i) === symbol) return true;
        return false;
    }

    function countSymbolOccurences(text: string, symbol: string) {
        let count = 0;
        for (let i = 0; i < text.length; i++)
            if (text.charAt(i) === symbol) count++;
        return count;
    }
</script>

<!-- If blocks, render a single space when there's one or more spaces, and a line break for each extra line break. -->
{#snippet blockSpace(firstToken: Token)}
    {@const hasSpace = symbolOccurs(space, ' ') || symbolOccurs(space, '\t')}
    {@const lines = Array.from(
        Array(Math.max(0, countSymbolOccurences(space, '\n'))).keys(),
    )}{#if hasSpace || lines.length > 0}{#key $insertion}<span
                class="space"
                role="none"
                data-id={firstToken.id}
                data-uiid="space"
            >
                {#if hasSpace}<div data-id={firstToken.id}
                        >{#if firstToken && $insertion?.token === firstToken}<InsertionPointView
                            ></InsertionPointView>{/if}<span
                            class="space-text"
                            data-uiid="space-text">&nbsp;</span
                        ></div
                    >{:else}{#each lines as line}<div class="break"
                            >{#if $insertion && $insertion.list[$insertion.index] === node && $insertion.line === line}<InsertionPointView
                                />{/if}</div
                        >{/each}{/if}</span
            >{/key}{/if}
{/snippet}

<!-- Don't render anything if we weren't given a node. -->
{#if node !== undefined}
    <!-- Render space preceding this node if not hidden, if there's a first token, and this node is the root of the preceding space. -->
    {#if !hide && firstToken && spaceRoot === node}
        {#if $blocks}
            {@render blockSpace(firstToken)}
        {:else}
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
            direction,
            node.getDescriptor(),
            ...(highlight ? highlight.values() : []),
            {
                block: $blocks,
                hide,
                small,
                evaluate: kind === ExpressionKind.Evaluate,
                definition: kind === ExpressionKind.Definition,
                Token: node instanceof Token,
                ProgramBlock: node instanceof Block && node.isRoot(),
                highlighted: highlight,
            },
        ]}
        data-uiid={node.getDescriptor()}
        data-id={node.id}
        id={`node-${node.id}`}
        aria-hidden={hide ? 'true' : null}
        aria-label={description}
        ><!--Render the value if there's a value ot render, or the node view otherwise -->
        {#if value}<ValueView {value} {node} interactive />{:else}
            <NodeView {node} />{/if}</div
    >
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
        cursor: grab;
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

    .block {
        display: flex;
        gap: var(--wordplay-border-width);
        width: fit-content;
    }

    .Block {
        min-height: var(--wordplay-min-line-height) !important;
    }

    .evaluate:not(:global(.Program, .ProgramBlock)),
    .definition:not(:global(.Program, .ProgramBlock)) {
        padding: calc(var(--wordplay-spacing) / 3);
        padding: calc(var(--wordplay-spacing) / 3)
            calc(var(--wordplay-spacing) / 2) calc(var(--wordplay-spacing) / 3)
            calc(var(--wordplay-spacing) / 2);
        box-shadow: var(--color-shadow) 0px 0px 4px;
        border-radius: var(--wordplay-border-radius);
    }

    .block.definition {
        border-inline-start: var(--wordplay-focus-width) solid var(--color-blue);
    }

    .block.evaluate:not(:global(.Program, .ProgramBlock)) {
        border-bottom: calc(2 * var(--wordplay-border-width)) solid
            var(--wordplay-inactive-color);
    }

    .row {
        flex-direction: row;
        align-items: baseline;
    }

    .column {
        flex-direction: column;
        align-items: inline-start;
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
</style>
