<svelte:options immutable={true} />

<script lang="ts">
    import type Node from '@nodes/Node';
    import {
        getEvaluation,
        getHidden,
        getInsertionPoint,
        getSpace,
        getTranslations,
    } from '../project/Contexts';
    import getNodeView from './util/nodeToView';
    import Expression from '@nodes/Expression';
    import ValueView from '@components/values/ValueView.svelte';
    import type Value from '@runtime/Value';
    import Space from './Space.svelte';

    export let node: Node | undefined;
    export let small: boolean = false;

    const evaluation = getEvaluation();
    const translations = getTranslations();

    $: description =
        node && $evaluation && translations && translations.length > 0
            ? node.getDescription(
                  translations[0],
                  $evaluation.evaluator.project.getNodeContext(node)
              )
            : null;

    let value: Value | undefined;
    $: {
        // Show a value if 1) it's an expression, 2) the evaluator is stepping, 3) it's not involved in the evaluation stack
        // and 4) the node's evaluation is currently evaluating. Start by assuming there isn't a value.
        value = undefined;
        if (
            $evaluation &&
            !$evaluation.playing &&
            node instanceof Expression &&
            !node.isEvaluationInvolved()
        ) {
            const root = $evaluation.evaluator.project
                .getRoot(node)
                ?.getEvaluationRoot(node);
            const eva = root
                ? $evaluation.evaluator.getEvaluationOf(root)
                : undefined;
            if (eva)
                value = $evaluation.evaluator.getLatestValueOf(
                    node,
                    eva.getStepNumber()
                );
        }
    }

    // Get the root's computed spaces store
    let spaces = getSpace();
    // See if this node has any to render.
    $: space = node ? $spaces?.get(node) : undefined;

    // Get the hidden context.
    let hidden = getHidden();
    $: hide = node ? $hidden?.has(node) : false;

    // Get the insertion point
    let insertion = getInsertionPoint();
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
        class="{node.constructor.name} node-view"
        class:hide
        class:small
        tabIndex="0"
        aria-hidden={hide ? 'true' : null}
        aria-label={description}
        data-id={node.id}
        >{#if value}<ValueView {value} />{:else}<svelte:component
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
    }

    .node-view:focus {
        outline: none;
    }

    .node-view.hovered {
        cursor: pointer;
    }

    /* When beginning dragged in an editor, hide the node view contents to create a sense of spatial integrity. */
    .dragged :global(.token-view) {
        opacity: 0;
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
