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
    import EmptyView from '@components/editor/blocks/EmptyView.svelte';
    import FoldToggle from '@components/editor/util/FoldToggle.svelte';
    import MenuTrigger from '@components/editor/menu/MenuTrigger.svelte';
    import getNodeView from '@components/editor/nodes/nodeToView';
    import Space from '@components/editor/nodes/Space.svelte';
    import {
        getDragTarget,
        getEvaluation,
        getEffectiveFolded,
        getHidden,
        getHighlights,
        getProject,
        getRoot,
        getSpaces,
    } from '@components/project/Contexts';
    import ValueView from '@components/values/ValueView.svelte';
    import { locales } from '@db/Database';
    import { InsertionPoint } from '@edit/drag/Drag';
    import Block from '@nodes/Block';
    import type Definition from '@nodes/Definition';
    import Expression from '@nodes/Expression';
    import Node from '@nodes/Node';
    import type { UnitDeriver } from '@nodes/NumberType';
    import type Root from '@nodes/Root';
    import Source from '@nodes/Source';
    import Token from '@nodes/Token';
    import { EVAL_CLOSE_SYMBOL, EVAL_OPEN_SYMBOL } from '@parser/Symbols';
    import type KeysOfType from '@util/KeysOfType';

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
        /** Suppress this node's leading space. Used in folded headers so a
         *  closing delimiter doesn't drag the hidden body's blank lines along
         *  with it (e.g. so a folded block reads as a clean "(…)"). */
        noSpace?: boolean;
        /** If set, render a fold toggle for the given node immediately AFTER this
         *  node's leading space and before its content. Foldable views use this
         *  for their first token so that, in text mode, the toggle lands on the
         *  same line as the content rather than at the end of the previous line
         *  (the leading newline renders as a <br> within this node's space). */
        foldToggleFor?: Node | undefined;
    }

    let {
        node: path,
        format,
        empty = 'menu',
        replaceable = false,
        index = undefined,
        noSpace = false,
        foldToggleFor = undefined,
    }: Props = $props();

    /** Get the value of the node, possibly undefined. */
    let node = $derived(
        path instanceof Node ? path : (path[0][path[1]] as Node | undefined),
    );

    const evaluation = getEvaluation();
    const project = getProject();
    const rootContext = getRoot();
    let root = $derived(rootContext?.root);

    // Source the description's Context from the project store, which only
    // changes on edits, rather than the evaluation store, which emits a new
    // object on every evaluator broadcast (i.e. every animation frame while a
    // program runs). Descriptions don't change between steps, so reading
    // $evaluation here would recompute every node's localized aria-label each
    // frame. Fall back to the evaluator's project for non-route render
    // contexts (e.g. previews) where the project store isn't set.
    let descriptionContext = $derived(
        node
            ? ($project ?? $evaluation?.evaluator.project)?.getNodeContext(node)
            : undefined,
    );
    let description = $derived(
        node && descriptionContext
            ? node.getDescription($locales, descriptionContext).toText()
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

    // Determine if the node should be elided ("…" instead of full subtree).
    let elided = $derived(
        node && rootContext ? rootContext.elided.has(node) : false,
    );

    // Code folding (#806/#883): whether this node is currently folded. The fold
    // control and the collapsed appearance live in the individual node views
    // that support folding (each gates on isFoldable); NodeView just reads the
    // state and passes it down via the `folded` prop so those views can render
    // their collapsed header.
    const folded = getEffectiveFolded();
    let isFolded = $derived(node !== undefined && ($folded?.has(node) ?? false));

    // Get the insertion point
    let dragTarget = getDragTarget();

    // Get the highlights
    let highlights = getHighlights();
    let highlight = $derived(node ? $highlights?.get(node) : undefined);

    // Get the Svelte component with which to render this node.
    let view = $derived(node ? getNodeView(node) : undefined);
    let ComponentView = $derived(view ? view.component : undefined);
    let style = $derived(view ? view.style : undefined);

    // The root Block is structural — it always exists and can't be removed,
    // so it shouldn't carry the visible block chrome (background, padding, shadow).
    let isRootBlock = $derived(node instanceof Block && node.isRoot());
</script>

{#snippet textSpace()}
    {#if !hide && !noSpace && firstToken !== undefined && spaceRoot === node}
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
    {#if !hide && !noSpace && firstToken !== undefined && spaceRoot === node && root !== undefined}
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
        {#if !format.block}{@render textSpace()}{:else}{@render blockSpace()}{/if}{#if foldToggleFor !== undefined}<FoldToggle
                node={foldToggleFor}
                lineStart={!format.block && space.includes('\n')}
            />{/if}<!-- Render the node view wrapper, but no extra whitespace! --><div
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
                    'root-block': isRootBlock,
                },
                style?.kind,
            ]}
            data-uiid={node.getDescriptor()}
            data-id={node.id}
            id={`node-${node.id}`}
            aria-hidden={hide ? 'true' : null}
            aria-label={description}
            ><!--Render the available value if debugging, node view otherwise -->{#if elided}<span
                    class="elided"
                    aria-label="elided">…</span
                >{:else}{#if value && node.isUndelimited()}<span class="eval"
                        >{EVAL_OPEN_SYMBOL}</span
                    >{/if}{#key ComponentView}<ComponentView
                        {node}
                        {format}
                        folded={isFolded}
                    />{/key}{#if value}{#if node.isUndelimited()}<span class="eval"
                            >{EVAL_CLOSE_SYMBOL}</span
                        >{/if}<div class="value"
                        ><ValueView {value} {node} interactive /></div
                    >{/if}{/if}
        </div>
    {:else}
        !
    {/if}{#if replaceable && format.block && format.editable && node !== undefined}<MenuTrigger
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

    .elided {
        color: var(--wordplay-inactive-color);
        padding: 0 var(--wordplay-spacing-half);
    }

    .block {
        display: flex;
        flex-direction: column;
        gap: 0;
        align-items: start;
        /* baseline aligns inline-row siblings by their text baselines, and
           falls back to start in column-direction parents (per CSS Box
           Alignment), so the block also doesn't stretch in column lists. */
        align-self: baseline;
        width: fit-content;
        height: fit-content;

        /** Animate some of the visual distinctions that come and go*/
        transition-property: padding, border-color, box-shadow, transform;
        transition-duration: calc(var(--animation-factor) * 200ms);
        transition-timing-function: ease-out;

        padding: var(--wordplay-block-padding-block)
            var(--wordplay-block-padding-inline);
        /* Sharp 1px outline — uses box-shadow with 0 blur so it doesn't
           affect layout and respects border-radius. */
        box-shadow: 0 0 0 var(--wordplay-border-width)
            var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        /* Opaque by default so ancestor fills don't bleed through.
           Kinds with their own fill override below; .none and .root-block opt out. */
        background: var(--wordplay-background);

        animation: calc(var(--animation-factor) * 200ms) ease-out 0s 1 entry;
    }

    /** Hover background and raised effect for blocks without hovered children.
        Mirrors the Button widget: hard offset shadow + 1px translate so the
        block reads as lifted.
        The :has() ignores Token wrappers so hovering over the inner text of
        a token still lifts its containing block (Tokens are .node-view.block
        too, but they're chrome — they shouldn't suppress the parent). */
    :global(.editor:not(.dragging))
        .node-view.block.editable:not(.blockselected):not(
            :has(.node-view.block:not(.Token):hover)
        ):not(.Token):hover,
    .node-view.block.editable:focus-visible {
        outline: var(--wordplay-focus-width) solid var(--wordplay-hover-light);
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
        transform: translate(-1px, -1px);
        cursor: grab;
    }

    /* Selected block: same raised treatment as hover/focus, with a
       stronger highlight outline. Drops the tinted background since it
       collides with kind fills. */
    .blockselected {
        outline: var(--wordplay-focus-width) solid
            var(--wordplay-highlight-color);
        box-shadow: var(--wordplay-border-width) var(--wordplay-border-width) 0
            var(--wordplay-border-color);
        transform: translate(-1px, -1px);
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
        background: var(--wordplay-block-fill-definition);
    }

    .block.reference {
        padding: var(--wordplay-spacing-half);
        border-block-end: var(--wordplay-focus-width) solid var(--color-blue);
        border-bottom-right-radius: 0;
    }

    .block.evaluate {
        background: var(--wordplay-block-fill-evaluate);
    }

    .block.type {
        font-size: var(--wordplay-small-font-size);
        padding: 0 var(--wordplay-spacing-half);
        /* Pastel-orange fill marks types/language tags. No outline or border —
           the fill alone is enough, and reads cleanly over any block color. */
        background: var(--wordplay-block-fill-type);
        box-shadow: none;
    }

    .block.predicate {
        background: var(--wordplay-block-fill-predicate);
    }

    .block.data {
        padding: var(--wordplay-spacing-half);
        background: var(--wordplay-block-fill-data);
    }

    .block.doc {
        padding: var(--wordplay-spacing-half);
        background: var(--wordplay-block-fill-doc);
        /* Inset border instead of the default outer outline, so the docs
           panel reads as a recessed/embedded surface. */
        box-shadow: inset 0 0 0 var(--wordplay-border-width)
            var(--wordplay-border-color);
    }

    /* When the docs panel has no content, NodeSequenceView shows its empty
       placeholder at the top level of the panel. Drop the panel's own
       chrome — the placeholder/menu trigger alone is enough. */
    .block.doc:has(> :global(.node-list[data-direction='block'] > .empty)) {
        padding: 0;
        background: transparent;
        box-shadow: none;
    }

    /* Tighten the gap between stacked Doc entries inside a docs panel so
       they read as continuous text rather than separated paragraphs. */
    .block.doc :global(.node-list[data-direction='block']) {
        gap: 0;
    }

    .block.none {
        padding: 0;
        box-shadow: none;
        background: transparent;
    }

    .block.root-block {
        padding: 0;
        background: transparent;
        box-shadow: none;
    }

    .block.blockoutput {
        outline: var(--wordplay-focus-width) solid
            var(--wordplay-evaluation-color);
    }

    .block.blockmajor {
        border-bottom: var(--wordplay-focus-width) solid var(--wordplay-error);
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    .block.blockminor {
        border-bottom: var(--wordplay-focus-width) solid var(--wordplay-warning);
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    .small {
        font-size: var(--wordplay-small-font-size);
    }

    .stream {
        text-decoration: underline dotted;
    }
</style>
