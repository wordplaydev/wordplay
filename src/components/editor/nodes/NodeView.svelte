<script lang="ts" module>
    import type Spaces from '@parser/Spaces';

    export type Format = {
        block: boolean;
        root: Root | undefined;
        editable: boolean;
        spaces: Spaces | undefined;
        definition?: Definition | undefined;
    };
</script>

<script lang="ts" generics="NodeType extends Node">
    import ValueView from '@components/values/ValueView.svelte';
    import { InsertionPoint } from '@edit/drag/Drag';
    import type Definition from '@nodes/Definition';
    import Expression from '@nodes/Expression';
    import Node from '@nodes/Node';
    import type { UnitDeriver } from '@nodes/NumberType';
    import type Root from '@nodes/Root';
    import Source from '@nodes/Source';
    import { EVAL_CLOSE_SYMBOL, EVAL_OPEN_SYMBOL } from '@parser/Symbols';
    import { locales } from '../../../db/Database';
    import Token from '../../../nodes/Token';
    import type KeysOfType from '../../../util/KeysOfType';
    import {
        getDragTarget,
        getEvaluation,
        getHidden,
        getHighlights,
        getRoot,
        getSpaces,
    } from '../../project/Contexts';
    import EmptyView from '../blocks/EmptyView.svelte';
    import MenuTrigger from '../menu/MenuTrigger.svelte';
    import getNodeView from './nodeToView';
    import Space from './Space.svelte';

    interface Props {
        /** The parent node containing the field to render. We take this instead of the field value so we can render a placeholder for empty values in blocks mode. */
        node:
            | [NodeType, KeysOfType<NodeType, Node | UnitDeriver | undefined>]
            | Node;
        /** The format to use when rendering */
        format: Format;
        /** The style of the empty view, if empty. We default to labeled */
        empty?: 'hide' | 'menu' | 'label';
        /** Whether to show a trigger to replace this node */
        replaceable?: boolean;
        /** The index of the node in the list, if it's in one */
        index?: number | undefined;
    }

    let {
        node: path,
        format,
        empty = 'menu',
        replaceable = false,
        index = undefined,
    }: Props = $props();

    /** Get the value of the node, possibly undefined. */
    let node = $derived(
        path instanceof Node ? path : (path[0][path[1]] as Node | undefined),
    );

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
        format.editable &&
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
    let hide = $derived(node && $hidden && $hidden.has(node));

    // Determine if the node is removed
    let removed = $derived(
        node && rootContext ? rootContext.removed.has(node) : false,
    );

    // Get the insertion point
    let dragTarget = getDragTarget();

    // Get the highlights
    let highlights = getHighlights();
    let highlight = $derived(node ? $highlights?.get(node) : undefined);

    // Get the Svelte component with which to render this node.
    let view = $derived(node ? getNodeView(node) : undefined);
    let ComponentView = $derived(view ? view.component : undefined);
    let style = $derived(view ? view.style : undefined);
</script>

{#snippet textSpace()}
    {#if !hide && firstToken !== undefined && spaceRoot === node}
        <Space
            token={firstToken}
            first={$spaces?.isFirst(firstToken) ?? false}
            line={$spaces?.getLineNumber(firstToken) ?? 1}
            {space}
            block={false}
            invisible={!(root?.root instanceof Source)}
            insertion={$dragTarget instanceof InsertionPoint &&
            $dragTarget.token === firstToken
                ? $dragTarget
                : undefined}
        />
    {/if}
{/snippet}

{#snippet blockSpace()}
    <!-- Render space if not hidden, and this is the token with the space -->
    {#if !hide && firstToken !== undefined && spaceRoot === node && root !== undefined}
        {@const tokenPrefersPrecedingSpace =
            space.length === 0 &&
            spaceRoot !== undefined &&
            root.getFieldOfChild(spaceRoot)?.space === true &&
            (index === undefined || index > 0)}
        <Space
            token={firstToken}
            first={false}
            line={undefined}
            space={tokenPrefersPrecedingSpace ? ' ' : space}
            invisible={tokenPrefersPrecedingSpace ||
                !(root?.root instanceof Source)}
            block={true}
            insertion={undefined}
        />
    {/if}
{/snippet}

<!-- Don't render anything if we weren't given a node. -->
{#if node !== undefined}
    {#if ComponentView !== undefined}
        <!-- In text mode, render space before the node view. -->
        {#if !format.block}{@render textSpace()}{:else}{@render blockSpace()}{/if}<!-- Render the node view wrapper, but no extra whitespace! --><div
            class={[
                'node-view',
                node.getDescriptor(),
                ...(highlight ? highlight : []),
                {
                    block: format.block,
                    hide,
                    removed,
                    inline: style?.direction === 'inline',
                    Token: node instanceof Token,
                    highlighted: highlight !== undefined,
                    editable: format.editable,
                },
                style?.kind,
            ]}
            data-uiid={node.getDescriptor()}
            data-id={node.id}
            id={`node-${node.id}`}
            aria-hidden={hide ? 'true' : null}
            aria-label={description}
            ><!--Render the available value if debugging, node view otherwise -->{#if value && node.isUndelimited()}<span
                    class="eval">{EVAL_OPEN_SYMBOL}</span
                >{/if}<ComponentView
                {node}
                {format}
            />{#if value}{#if node.isUndelimited()}<span class="eval"
                        >{EVAL_CLOSE_SYMBOL}</span
                    >{/if}<div class="value"
                    ><ValueView {value} {node} interactive /></div
                >{/if}
        </div>
    {:else}
        !
    {/if}{#if replaceable && format.block && node !== undefined}<MenuTrigger
            anchor={node}
        />{/if}
{:else if node === undefined && format.block && Array.isArray(path)}
    <EmptyView node={path[0]} field={path[1]} style={empty} {format} />
{/if}

<style>
    .node-view {
        display: inline;
        position: relative;
        border-radius: var(--wordplay-editor-radius);
        padding: 0;
        border-color: transparent;

        /** This allows us to style things up the the tree. */
        text-decoration: inherit;
    }

    .value {
        display: inline-block;
        /* margin-inline-start: var(--wordplay-spacing); */
        transform: translateY(var(--wordplay-spacing-half));
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

    .removed::after {
        content: ''; /* Required for pseudo-elements */
        position: absolute; /* Position the line relative to the div */
        width: 100%;
        height: var(--wordplay-focus-width); /* Adjust line thickness */
        top: 50%; /* Center the line vertically */
        left: 0;
        background: var(--wordplay-error); /* Adjust line color */
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
        gap: 0;
        align-items: start;
        width: fit-content;
        height: fit-content;

        /** Animate some of the visual distinctions that come and go*/
        transition-property: padding, border-color;
        transition-duration: calc(var(--animation-factor) * 200ms);
        transition-timing-function: ease-out;

        padding: var(--wordplay-spacing);
        box-shadow: var(--color-shadow) 0px 0px 4px;
        border-radius: var(--wordplay-border-radius);

        animation: calc(var(--animation-factor) * 200ms) ease-out 0s 1 entry;
    }

    /** Hover background and scale for blocks without hovered children */
    :global(.editor:not(.dragging))
        .node-view.block.editable:not(.blockselected):not(
            :has(.node-view.block:hover)
        ):not(.Token):hover {
        outline: var(--wordplay-focus-width) solid var(--wordplay-hover);
        box-shadow: var(--color-shadow) 4px 4px 4px;
        cursor: grab;
    }

    .blockselected {
        outline: var(--wordplay-focus-width) solid
            var(--wordplay-highlight-color);
        background: var(--wordplay-hover);
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
        gap: 0;
    }

    .block.definition {
        border-inline-start: var(--wordplay-focus-width) solid var(--color-blue);
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
    }

    .block.reference {
        padding: var(--wordplay-spacing-half);
        border-block-end: var(--wordplay-focus-width) solid var(--color-blue);
        border-bottom-right-radius: 0;
    }

    .block.evaluate {
        border-block-end: var(--wordplay-focus-width) solid var(--color-purple);
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    .block.type {
        font-size: var(--wordplay-small-font-size);
        box-shadow: inset var(--wordplay-border-color) 0px 0px
            var(--wordplay-border-width);
        background: var(--wordplay-alternating-color);
        padding: var(--wordplay-spacing) var(--wordplay-spacing-half);
    }

    .block.predicate {
        border-inline-start: var(--wordplay-focus-width) solid var(--color-pink);
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
    }

    .block.data {
        box-shadow: inset var(--color-shadow) 0px 0px
            var(--wordplay-focus-width);
        padding: var(--wordplay-spacing-half);
        border: dashed var(--wordplay-border-width) var(--wordplay-border-color);
        background: var(--color-shadow-transparent);
    }

    .block.none {
        padding: 0;
        box-shadow: none;
    }

    .block.blockoutput {
        outline: var(--wordplay-focus-width) solid
            var(--wordplay-evaluation-color);
    }

    .small {
        font-size: var(--wordplay-small-font-size);
    }

    .stream {
        text-decoration: underline dotted;
    }
</style>
