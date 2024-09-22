<svelte:options immutable={true} />

<script lang="ts">
    import type Node from '@nodes/Node';
    import {
        getEvaluation,
        getHidden,
        getInsertionPoint,
        getRoot,
        getSpace,
        isBlocks,
    } from '../project/Contexts';
    import getNodeView from './util/nodeToView';
    import Expression, { ExpressionKind } from '@nodes/Expression';
    import ValueView from '@components/values/ValueView.svelte';
    import type Value from '@values/Value';
    import Space from './Space.svelte';
    import Token from '../../nodes/Token';
    import { locales } from '../../db/Database';
    import InsertionPointView from './InsertionPointView.svelte';
    import Block from '@nodes/Block';

    export let node: Node | undefined;
    export let small = false;
    export let direction: 'row' | 'column' = 'row';

    const evaluation = getEvaluation();
    const root = getRoot();

    $: description =
        node && $evaluation
            ? node
                  .getDescription(
                      $locales,
                      $evaluation.evaluator.project.getNodeContext(node),
                  )
                  .toText()
            : null;

    let value: Value | undefined;
    $: {
        // Show a value if 1) it's an expression, 2) the evaluator is stepping, 3) it's not involved in the evaluation stack
        // and 4) the node's evaluation is currently evaluating. Start by assuming there isn't a value.
        // Note that this interacts with Editor.handleEdit(), which adjust caret positions if a value is rendered.
        value = undefined;
        if (
            $evaluation &&
            !$evaluation.playing &&
            node instanceof Expression &&
            !node.isEvaluationInvolved()
        )
            value =
                $evaluation.evaluator.getLatestExpressionValueInEvaluation(
                    node,
                );
    }

    const blocks = isBlocks();

    // Get the root's computed spaces store
    let spaces = getSpace();
    // See if this node has any space to render.
    $: firstToken = node?.getFirstLeaf();
    $: spaceRoot = $root && node ? $root.getSpaceRoot(node) : undefined;
    $: space = firstToken ? $spaces?.getSpace(firstToken) ?? '' : '';

    // Get the hidden context.
    let hidden = getHidden();
    $: hide = node ? $hidden?.has(node) : false;

    // Get the insertion point
    let insertion = getInsertionPoint();

    $: kind =
        $blocks && node instanceof Expression ? node.getKind() : undefined;

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

<!-- Don't render anything if we weren't given a node. -->
{#if node !== undefined}
    <!-- Render space preceding this node, if any, then either a value view if stepping or the node. -->
    {#if !hide && firstToken && spaceRoot === node}<!-- If blocks, render a single space when there's one or more spaces, and a line break for each extra line break. -->{#if $blocks}{@const hasSpace =
                symbolOccurs(space, ' ')}{@const lines = Array.from(
                Array(
                    Math.max(0, countSymbolOccurences(space, '\n') - 1),
                ).keys(),
            )}{#if hasSpace || lines.length > 0}{#key $insertion}<span
                        class="space"
                        role="none"
                        data-id={firstToken.id}
                        data-uiid="space"
                    >
                        {#if hasSpace}<div data-id={firstToken.id}
                                >{#if firstToken && $insertion?.token === firstToken}<InsertionPointView
                                    ></InsertionPointView>{/if}{space}</div
                            >{:else}{#each lines as line}<div class="break"
                                    >{#if $insertion && $insertion.list[$insertion.index] === node && $insertion.line === line}<InsertionPointView
                                        />{/if}</div
                                >{/each}{/if}</span
                    >{/key}{/if}{:else}
            <Space
                token={firstToken}
                first={$spaces.isFirst(firstToken)}
                line={$spaces.getLineNumber(firstToken)}
                {space}
                insertion={$insertion?.token === firstToken
                    ? $insertion
                    : undefined}
            />{/if}{/if}<div
        class="node-view {$blocks
            ? 'block'
            : ''} {direction} {node.getDescriptor()} {node instanceof Token
            ? 'Token'
            : ''} {node instanceof Block && node.isRoot()
            ? 'ProgramBlock'
            : ''}"
        data-uiid={node.getDescriptor()}
        class:hide
        class:small
        class:evaluate={kind === ExpressionKind.Evaluate}
        class:definition={kind === ExpressionKind.Definition}
        data-id={node.id}
        id={`node-${node.id}`}
        aria-hidden={hide ? 'true' : null}
        aria-label={description}
        >{#if value}<ValueView
                {value}
                {node}
                interactive
            />{:else}<svelte:component
                this={getNodeView(node)}
                {node}
            />{/if}</div
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

    .evaluate:not(.Program, .ProgramBlock),
    .definition:not(.Program, .ProgramBlock) {
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

    .block.evaluate:not(.Program, .ProgramBlock) {
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
