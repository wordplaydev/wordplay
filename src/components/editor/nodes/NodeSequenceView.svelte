<script module lang="ts">
    const LIMIT = 10;
</script>

<script lang="ts" generics="NodeType extends Node">
    import EmptyView from '@components/editor/blocks/EmptyView.svelte';
    import MenuTrigger from '@components/editor/menu/MenuTrigger.svelte';
    import NodeView, {
        type Format,
    } from '@components/editor/nodes/NodeView.svelte';
    import {
        getCaret,
        getDragTarget,
        getEditor,
    } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import { locales } from '@db/Database';
    import { InsertionPoint } from '@edit/drag/Drag';
    import type NodeRef from '@locale/NodeRef';
    import type ValueRef from '@locale/ValueRef';
    import Node from '@nodes/Node';
    import type KeysOfType from '@util/KeysOfType';
    import { tick } from 'svelte';

    interface Props {
        /** The node containing a list of nodes to render */
        node: NodeType;
        /** A named field of the node type that is a list of Nodes. We permit value and node refs because markup can use them, but filter them. */
        field: KeysOfType<NodeType, (Node | ValueRef | NodeRef)[]>;
        /** An optional override if the node list is custom */
        filtered?: Node[];
        /** How to handle an empty list: hide (don't render anything), label (show a localized placeholder label), menu (show a compact trigger menu) */
        empty: 'hide' | 'label' | 'menu';
        /** The current format of the subtree */
        format: Format;
        /** Whether to show an append button */
        add?: boolean;
        /** What layout to use. Inline wraps automatically. */
        direction?: 'inline' | 'block';
        /** Whether the list supports being collapsed when it's long. */
        elide?: boolean;
        /** Whether to indent the list.*/
        indent?: boolean;
        /** Whether to wrap the list if it exceeds the width of its container */
        wrap?: boolean;
        /** Whether to inject line breaks. Only use once in a nesting tree! */
        breaks?: boolean;
    }

    let {
        node,
        field,
        filtered,
        empty,
        format,
        elide = false,
        add = true,
        direction = 'inline',
        indent = false,
        wrap = false,
        breaks = false,
    }: Props = $props();

    let caret = getCaret();
    let editor = getEditor();
    let dragTarget = getDragTarget();
    let insertion = $derived(
        $dragTarget instanceof InsertionPoint &&
            $dragTarget.node === node &&
            $dragTarget.field === field
            ? $dragTarget
            : undefined,
    );

    let nodes = $derived(filtered ?? (node[field] as Node[]));

    /** Whether the list is long enough to be collapsible. */
    let collapsible = $derived(elide && nodes.length > LIMIT);

    /** The user's preference: collapsed unless they've toggled it open. */
    let userCollapsed = $state(true);

    /** Whether the caret is currently inside any item in the list. */
    let caretInside = $derived.by(() => {
        if (!collapsible || !$caret) return false;
        const position =
            $caret.position instanceof Node
                ? $caret.position
                : $caret.tokenIncludingSpace;
        if (!position) return false;
        return nodes.some((n) => n === position || n.contains(position));
    });

    /** Show all items unless the list is collapsible and the user has it collapsed and the caret isn't inside it. */
    let expanded = $derived(!collapsible || !userCollapsed || caretInside);
</script>

{#snippet insertFeedback()}
    <!--  Need a zero with space here to ensure baseline alignment has text to calculate on.
          Otherwise, the baseline is pushed down, causing a layout gap that prevents the pointer
          from remaining stably under the pointer during a drag, causing a flickering. -->
    <div class="insertion-feedback">&ZeroWidthSpace;</div>
{/snippet}

{#snippet append()}{#if format.editable && nodes.length > 0 && add}<div
            class="append"
            ><MenuTrigger
                anchor={{ parent: node, field, index: nodes.length }}
                insert
            /></div
        >{/if}{/snippet}

{#snippet toggleControl()}
    {#if collapsible}
        {@const text = $locales.getTextStructure(
            (l) => l.ui.source.toggle.expandSequence,
        )}
        <Button
            classes="elide-toggle"
            background
            padding={false}
            tip={() => $locales.getPlainText(expanded ? text.on : text.off)}
            action={() => {
                // If we're about to collapse and the caret is inside the list,
                // move it onto the parent node so the list actually collapses.
                if (!userCollapsed && caretInside && caret && $caret)
                    caret.set($caret.withPosition(node));
                userCollapsed = !userCollapsed;
                // The selection outline is measured from the rendered DOM, so
                // toggling visibility leaves it stale until something else
                // forces a remeasure. Refresh after the next render.
                tick().then(() => $editor?.refreshHighlights());
            }}
            ><span class="elide-label"
                >{#if expanded}–{:else}+ {nodes.length} …{/if}</span
            ></Button
        >
    {/if}
{/snippet}

{#snippet items()}
    {#each nodes as node, index}
        {#if insertion?.index === index}
            {@render insertFeedback()}
        {/if}
        <!-- If in blocks mode and we're wrapping, render line breaks -->
        {#if format.block && breaks && format.spaces}
            {@const space = format.spaces.getSpace(node)}
            {#each space.split('\n').slice(0, -1), index}
                <div class="break" class:first={index === 0}></div>
            {/each}
        {/if}
        <NodeView {node} {format} {index} />
    {:else}
        <EmptyView
            {node}
            {field}
            style={empty}
            {format}
            index={0}
            inserting={insertion?.index === 0}
        />
    {/each}
    <!-- Render line breaks between the last node and whatever follows the sequence -->
    {#if format.block && breaks && direction === 'block' && format.spaces && nodes.length > 0}
        {@const allTokens = format.spaces.getTokens()}
        {@const lastLeaf = nodes.at(-1)?.leaves().at(-1)}
        {@const lastLeafIdx =
            lastLeaf !== undefined ? allTokens.indexOf(lastLeaf) : -1}
        {@const trailingToken =
            lastLeafIdx >= 0 ? allTokens[lastLeafIdx + 1] : undefined}
        {@const trailingSpace = trailingToken
            ? format.spaces.getSpace(trailingToken)
            : ''}
        {#each trailingSpace.split('\n').slice(0, -1)}
            <div class="break"></div>
        {/each}
    {/if}
    {#if nodes.length > 0}
        {#if insertion?.index === nodes.length}
            {@render insertFeedback()}
        {/if}
        {@render append()}
    {/if}
{/snippet}

{#snippet list()}
    {#if nodes.length > 0 || empty !== 'hide'}
        <!-- These data attributes are used by Editor.svelte:getBlockInsertionPoint() -->
        <div
            class="node-list"
            class:indent
            class:wrap
            class:editable={format.editable}
            class:empty={nodes.length === 0}
            data-field={field}
            data-direction={direction}
        >
            {@render toggleControl()}
            {#if expanded}
                {@render items()}
            {/if}
        </div>
    {/if}
{/snippet}

{#if format.block}
    {@render list()}
{:else}
    {@render toggleControl()}{#if expanded}{#each nodes as node, index}<NodeView
                {node}
                {format}
                {index}
            />{/each}{/if}
{/if}

<style>
    .elide-label {
        font-family: var(--wordplay-app-font);
        font-size: var(--wordplay-small-font-size);
        padding-inline: var(--wordplay-spacing-half);
    }

    :global(.elide-toggle) {
        min-height: 0;
        align-self: center;
    }

    .node-list {
        display: flex;
        flex-direction: row;
        gap: 0;
        align-items: baseline;
        min-width: var(--wordplay-spacing);
        min-height: var(--wordplay-spacing);
    }

    [data-direction='block'].node-list {
        flex-direction: column;
        /* Don't stretch column children (e.g. the .append button) to the
           column's full width — they should size to their content. */
        align-items: start;
        gap: var(--wordplay-spacing-half);
        padding-block-start: var(--wordplay-spacing-half);
        padding-block-end: var(--wordplay-spacing-half);
    }

    [data-direction='inline'].node-list {
        padding-inline-start: var(--wordplay-spacing-half);
        padding-inline-end: var(--wordplay-spacing-half);
    }

    [data-direction='inline'].node-list.wrap {
        flex-wrap: wrap;
        row-gap: var(--wordplay-spacing-half);
    }

    .node-list.indent {
        margin-inline-start: var(--wordplay-spacing);
    }

    .insertion-feedback {
        pointer-events: none;
        align-self: stretch;
        background-color: var(--wordplay-highlight-color);
    }

    [data-direction='inline'] > .insertion-feedback {
        width: var(--wordplay-focus-width);
    }
    [data-direction='block'] > .insertion-feedback {
        width: 100%;
        height: var(--wordplay-focus-width);
        margin-block-start: var(--wordplay-block-insertion-margin);
        margin-block-end: var(--wordplay-block-insertion-margin);
    }

    .append {
        margin-inline-start: var(--wordplay-spacing-half);
    }

    .break {
        display: block;
        color: var(--wordplay-inactive-color);
    }

    /* In an inline-direction node-list, breaks force a wrap by occupying a
       full row (flex-basis: 100%) and add a line-height of vertical space. */
    [data-direction='inline'] > .break {
        flex-basis: 100%;
        min-height: var(--wordplay-min-line-height);
    }

    /* In a column list, breaks add space for blank-line newlines (e.g.
       MarkupView paragraph separation). The newline marker itself is
       rendered inline by Space.svelte before the next token, so the
       break div is empty. */
    [data-direction='block'] > .break {
        min-height: var(--wordplay-min-line-height);
    }

    /* The first break in a leading whitespace's break sequence is the
       implicit one that pairs with the column gap or inline wrap, so
       collapse it to zero. CaretView.svelte depends on it being in the DOM. */
    .break.first {
        min-height: 0;
        max-height: 0;
    }
</style>
