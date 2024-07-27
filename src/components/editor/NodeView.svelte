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
</script>

<!-- Don't render anything if we weren't given a node. -->
{#if node !== undefined}
    <!-- Render space preceding this node, if any, then either a value view if stepping or the node. -->
    {#if !hide && firstToken && spaceRoot === node}{#if $blocks}{#if space
                .replaceAll('\n', '')
                .replaceAll('\t', '').length > 0}<div>&nbsp;</div>{/if}{:else}
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
        border-top-left-radius: var(--wordplay-editor-radius);
        border-bottom-right-radius: var(--wordplay-editor-radius);
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

    .evaluate,
    .definition {
        background: var(--wordplay-background);
        padding: calc(var(--wordplay-spacing) / 3);
        border-start-start-radius: 0;
        border-start-end-radius: var(--wordplay-border-radius);
        border-end-end-radius: var(--wordplay-border-radius);
        border-end-start-radius: 0;
        padding: calc(var(--wordplay-spacing) / 3)
            calc(var(--wordplay-spacing) / 2) calc(var(--wordplay-spacing) / 3)
            calc(var(--wordplay-spacing) / 2);
        box-shadow: var(--color-shadow) 0px -1px 5px;
        border-radius: 1px calc(3 * var(--wordplay-border-radius))
            calc(3 * var(--wordplay-border-radius)) 1px;
    }

    .block.definition {
        border-inline-start: calc(2 * var(--wordplay-border-width)) solid
            var(--color-blue);
    }

    .block.evaluate {
        border-bottom: calc(2 * var(--wordplay-border-width)) solid
            var(--color-orange);
    }

    .row {
        flex-direction: row;
        align-items: baseline;
    }

    .column {
        flex-direction: column;
        align-items: inline-start;
    }
</style>
