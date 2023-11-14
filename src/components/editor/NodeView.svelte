<svelte:options immutable={true} />

<script lang="ts">
    import type Node from '@nodes/Node';
    import {
        getEvaluation,
        getHidden,
        getInsertionPoint,
        getSpace,
    } from '../project/Contexts';
    import getNodeView from './util/nodeToView';
    import Expression, { ExpressionKind } from '@nodes/Expression';
    import ValueView from '@components/values/ValueView.svelte';
    import type Value from '@values/Value';
    import Space from './Space.svelte';
    import Token from '../../nodes/Token';
    import concretize from '../../locale/concretize';
    import { blocks, locales } from '../../db/Database';

    export let node: Node | undefined;
    export let small = false;

    const evaluation = getEvaluation();

    $: description =
        node && $evaluation
            ? node
                  .getDescription(
                      concretize,
                      $locales,
                      $evaluation.evaluator.project.getNodeContext(node)
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
                    node
                );
    }

    // Get the root's computed spaces store
    let spaces = getSpace();
    // See if this node has any to render.
    $: space = node && $spaces ? $spaces.get(node) : undefined;

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
    {#if space && !hide}<Space
            {...space}
            insertion={$insertion?.token === space.token
                ? $insertion
                : undefined}
        />{/if}<div
        class="{node.getDescriptor()} {node instanceof Token
            ? 'Token'
            : ''} node-view"
        data-uiid={node.getDescriptor()}
        class:hide
        class:small
        class:block={kind === ExpressionKind.Evaluate ||
            kind === ExpressionKind.Definition}
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

    .block {
        display: inline-block;
        vertical-align: baseline;
        background: var(--wordplay-background);
        padding: calc(var(--wordplay-spacing) / 3);
        border-start-start-radius: 0;
        border-start-end-radius: var(--wordplay-border-radius);
        border-end-end-radius: var(--wordplay-border-radius);
        border-end-start-radius: 0;
        padding: calc(var(--wordplay-spacing) / 2);
        box-shadow: var(--color-shadow) 1px 1px 4px;
    }

    :global(.editor:not(.dragging))
        .evaluate:hover:not(:has(.node-view:hover)) {
        background: var(--color-blue-transparent);
        outline: var(--wordplay-focus-width) solid var(--color-blue);
    }

    :global(.editor:not(.dragging))
        .definition:hover:not(:has(.node-view:hover)) {
        background: var(--color-purple-transparent);
        outline: var(--wordplay-focus-width) solid var(--color-purple);
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
</style>
