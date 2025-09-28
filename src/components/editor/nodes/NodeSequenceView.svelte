<script module lang="ts">
    const LIMIT = 20;
</script>

<script lang="ts" generics="NodeType extends Node">
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import { locales } from '@db/Database';
    import type NodeRef from '@locale/NodeRef';
    import type ValueRef from '@locale/ValueRef';
    import Node from '@nodes/Node';
    import { getCaret, getProject, getRoot } from '../../project/Contexts';
    import Button from '../../widgets/Button.svelte';
    import NodeView, { type Format } from './NodeView.svelte';

    /** Fields of type KT on T */
    type KeysOfType<T, KT> = {
        [K in keyof T]: K extends string
            ? T[K] extends KT
                ? K
                : never
            : never;
    }[keyof T];

    interface Props {
        /** The node containing a list of nodes to render */
        node: NodeType;
        /** A named field of the node type that is a list of Nodes. We permit value and node refs because markup can use them, but filter them. */
        field: KeysOfType<NodeType, (Node | ValueRef | NodeRef)[]>;
        /** An optional override if the node list is custom */
        filtered?: Node[];
        format: Format;
        block?: boolean;
        elide?: boolean;
        indent?: boolean;
    }

    let {
        node,
        field,
        filtered,
        format,
        elide = $bindable(false),
        block = false,
        indent = false,
    }: Props = $props();

    let caret = getCaret();
    let root = getRoot();
    let project = getProject();

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
    {@const label = node.getFieldNamed(field)?.label}
    <div class="node-list" class:block class:indent>
        {#each nodes as node}
            <NodeView {node} {format} />
        {:else}
            {#if label && $project && root?.root}
                <span class="label">
                    <LocalizedText
                        path={label(
                            $locales,
                            /** This isn't actually correct, but it's an empty list, so it shouldn't matter */
                            node,
                            $project.getNodeContext(node),
                            root.root,
                        )}
                    />
                </span>
            {/if}
        {/each}
    </div>
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
        gap: var(--wordplay-spacing);
        align-items: baseline;
        min-width: 1em;
        min-height: 1em;
    }
    .node-list.block {
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .node-list.indent {
        margin-inline-start: var(--wordplay-spacing);
    }

    .label {
        font-style: italic;
        color: var(--wordplay-inactive-color);
        font-size: var(--wordplay-small-font-size);
    }
</style>
