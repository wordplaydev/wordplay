<script module lang="ts">
    const LIMIT = 20;
</script>

<script lang="ts" generics="NodeType extends Node">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type NodeRef from '@locale/NodeRef';
    import type ValueRef from '@locale/ValueRef';
    import Node from '@nodes/Node';
    import type KeysOfType from '../../../util/KeysOfType';
    import { getCaret, getInsertionPoint } from '../../project/Contexts';
    import Button from '../../widgets/Button.svelte';
    import EmptyView from '../blocks/EmptyView.svelte';
    import MenuTrigger from '../menu/MenuTrigger.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    interface Props {
        /** The node containing a list of nodes to render */
        node: NodeType;
        /** A named field of the node type that is a list of Nodes. We permit value and node refs because markup can use them, but filter them. */
        field: KeysOfType<NodeType, (Node | ValueRef | NodeRef)[]>;
        /** An optional override if the node list is custom */
        filtered?: Node[];
        /** How to handle an empty list: hide (don't render anything), label (show a localized placeholder label), menu (show a compact trigger menu) */
        empty: 'hide' | 'label' | 'menu';
        format: Format;
        /** Whether to lay out the list inline or block */
        block?: boolean;
        /** Whether to elide the list when it's long. */
        elide?: boolean;
        /** Whether to indent the list.*/
        indent?: boolean;
        /** Whether to add padding between items in blocks mode. */
        padding?: boolean;
    }

    let {
        node,
        field,
        filtered,
        empty,
        format,
        elide = $bindable(false),
        block = false,
        indent = false,
        padding = true,
    }: Props = $props();

    let caret = getCaret();
    let insertionPoint = getInsertionPoint();
    let insertionFeedback = $derived(
        $insertionPoint !== undefined &&
            $insertionPoint.node === node &&
            $insertionPoint.field === field
            ? $insertionPoint
            : undefined,
    );

    let nodes = $derived(filtered ?? (node[field] as Node[]));

    /**
     * To help scalability of the editor, only show the first few values.
     * If the caret is inside, show the ones nearby the caret.
     * And allow the creator to toggle them all to be shown, if they want to take
     * the performance hit.
     **/
    let visible: Node[] = $state([]);
    let hiddenBefore = $state(0);
    let hiddenAfter = $state(0);

    // Update what's hidden and visible based on state.
    $effect(() => {
        // More than some number? Elide.
        if (elide && nodes.length > LIMIT && $caret) {
            const first = nodes.at(0);
            const last = nodes.at(-1);
            const node =
                $caret.position instanceof Node
                    ? $caret.position
                    : $caret.tokenIncludingSpace;
            const firstPosition = first
                ? $caret.source.getNodeFirstPosition(first)
                : undefined;
            const lastPosition = last
                ? $caret.source.getNodeLastPosition(last)
                : undefined;
            const anchorPosition = node
                ? $caret.source.getNodeFirstPosition(node)
                : undefined;

            // Find the node in the list on which we'll anchor.
            const anchor =
                anchorPosition !== undefined &&
                firstPosition !== undefined &&
                lastPosition !== undefined &&
                firstPosition < anchorPosition &&
                anchorPosition < lastPosition
                    ? nodes.find((n) => node && n.contains(node))
                    : nodes.at(-1);

            // A caret? See if it's in the list, and if so, show what's around it.
            if (anchor) {
                const index = nodes.indexOf(anchor);
                const min = Math.round(Math.max(0, index - LIMIT / 2));
                const max = Math.round(
                    Math.min(nodes.length, index + LIMIT / 2),
                );
                visible = nodes.slice(min, max);
                hiddenBefore = min;
                hiddenAfter = nodes.length - max;
            } else {
                visible = nodes.slice(0, LIMIT / 2);
                hiddenBefore = 0;
                hiddenAfter = Math.max(0, Math.round(nodes.length - LIMIT / 2));
            }
        } else {
            visible = nodes;
            hiddenBefore = 0;
            hiddenAfter = 0;
        }
    });
</script>

{#if format.block}
    {#if nodes.length > 0 || empty !== 'hide'}
        <!-- These data attributes are used by Editor.svelte:getBlockInsertionPoint() -->
        <div
            class="node-list"
            class:indent
            class:padding
            data-field={field}
            data-direction={block ? 'block' : 'inline'}
        >
            {#each nodes as node, index}
                {#if insertionFeedback?.index === index}
                    <div class="insertion-feedback"></div>
                {/if}
                <NodeView {node} {format} />
            {:else}
                <EmptyView {node} {field} style={empty} {format} index={0} />
            {/each}
            {#if nodes.length > 0}
                {#if insertionFeedback?.index === nodes.length}
                    <div class="insertion-feedback"></div>
                {/if}
                {#if format.editable}<MenuTrigger
                        anchor={{ parent: node, field, index: nodes.length }}
                        insert
                    />{/if}
            {/if}
        </div>
    {/if}
{:else}
    {#if hiddenBefore > 0}
        <Button
            tip={(l) => l.ui.source.button.expandSequence}
            action={() => (elide = false)}
            ><span class="count"
                ><LocalizedText path={(l) => l.ui.edit.show} />
                ({hiddenBefore})</span
            ></Button
        >{/if}{#each visible as node}<NodeView
            {node}
            {format}
        />{/each}{#if hiddenAfter > 0}<Button
            tip={(l) => l.ui.source.button.expandSequence}
            action={() => (elide = false)}
            ><span class="count"
                ><LocalizedText path={(l) => l.ui.edit.show} />
                ({hiddenAfter})</span
            ></Button
        >{/if}
{/if}

<style>
    .count {
        font-size: x-small;
        color: var(--wordplay-inactive-color);
    }

    .node-list {
        display: flex;
        flex-direction: row;
        gap: 0;
        align-items: baseline;
        min-width: var(--wordplay-spacing);
        min-height: var(--wordplay-spacing);
    }

    .node-list.padding {
        padding: var(--wordplay-spacing);
    }

    [data-direction='block'].node-list {
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .node-list.indent {
        margin-inline-start: var(--wordplay-spacing);
    }

    .insertion-feedback {
        align-self: stretch;
        background-color: var(--wordplay-highlight-color);
    }

    [data-direction='inline'].node-list .insertion-feedback {
        width: var(--wordplay-focus-width);
    }
    [data-direction='block'].node-list .insertion-feedback {
        width: 100%;
        height: var(--wordplay-focus-width);
    }
</style>
