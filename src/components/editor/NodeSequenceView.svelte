<svelte:options immutable={true} />

<script context="module" lang="ts">
    const LIMIT = 10;
</script>

<script lang="ts">
    import Node from '@nodes/Node';
    import { getCaret } from '../project/Contexts';
    import NodeView from './NodeView.svelte';

    export let nodes: Node[];
    export let elide: boolean = false;

    let caret = getCaret();

    /**
     * To help scalability of the editor, only show the first few values.
     * If the caret is inside, show the ones nearby the caret.
     * And allow the creator to toggle them all to be shown, if they want to take
     * the performance hit.
     **/
    let visible: Node[];
    let hiddenBefore: number = 0;
    let hiddenAfter: number = 0;
    $: {
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

            const anchor =
                anchorPosition !== undefined &&
                firstPosition !== undefined &&
                lastPosition !== undefined &&
                firstPosition < anchorPosition &&
                anchorPosition < lastPosition
                    ? nodes.find((n) => node && n.contains(node))
                    : undefined;

            // A caret? See if it's in the list, and if so, show what's around it.
            if (anchor) {
                const index = nodes.indexOf(anchor);
                const min = Math.max(0, index - LIMIT / 2);
                const max = Math.min(nodes.length, index + LIMIT / 2);
                visible = nodes.slice(min, max);
                hiddenBefore = min;
                hiddenAfter = nodes.length - max;
            } else {
                visible = nodes.slice(0, LIMIT / 2);
                hiddenBefore = 0;
                hiddenAfter = Math.max(0, nodes.length - LIMIT / 2);
            }
        } else {
            visible = nodes;
            hiddenBefore = 0;
            hiddenAfter = 0;
        }
    }
</script>

{#if hiddenBefore > 0}
    <span
        role="button"
        tabindex="0"
        class="count"
        on:pointerdown={() => (elide = false)}
        on:keydown={(event) =>
            event.key === ' ' || event.key === 'Enter'
                ? (elide = false)
                : undefined}><br />… {hiddenBefore}</span
    >{/if}{#each visible as node (node.id)}<NodeView
        {node}
    />{/each}{#if hiddenAfter > 0}<span
        class="count"
        role="button"
        tabindex="0"
        on:pointerdown={() => (elide = false)}
        on:keydown={(event) =>
            event.key === ' ' || event.key === 'Enter'
                ? (elide = false)
                : undefined}><br />… {hiddenAfter}</span
    >{/if}

<style>
    .count {
        font-size: x-small;
        color: var(--wordplay-disabled-color);
    }
</style>
