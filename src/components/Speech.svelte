<script lang="ts">
    import { fade } from "svelte/transition";
    import type Node from "../nodes/Node";

    export let node: Node;
    export let explanation: string;
    export let secondary: boolean = false;

    let scrollTop: number = 0;
    let scrollLeft: number = 0;
    let position: { left: number, top: number };
    $: {
        // Find the view of the node.
        let nodeView = node ? document.querySelector(`.node-view[data-id="${node.id}"]`) : undefined;

        // Find the position of the node.
        if(nodeView) {
            const rect = nodeView.getBoundingClientRect();
            position = {
                left: rect.right + scrollLeft,
                top: rect.bottom + scrollTop
            };
        }

    }

    // Find the position of the node and show it's explanation
</script>

<svelte:window bind:scrollX={scrollLeft} bind:scrollY={scrollTop} />

<div
    class="speech"
    class:secondary
    transition:fade={{ duration: 250 }}
    style:left={`${position.left}px`}
    style:top={`${position.top}px`}
>
    {explanation}
</div>

<style>
    .speech {
        position: absolute;
        padding: var(--wordplay-spacing);
        z-index: 2;
        background-color: var(--wordplay-error);
        color: var(--wordplay-background);
        box-shadow: -2px calc(2 * var(--wordplay-border-width)) calc(2 * var(--wordplay-border-width)) rgba(0,0,0,.5);
        max-width: 20em;
        border-radius: var(--wordplay-border-radius);
        transition: left, right, 0.25s ease-out;
    }

    .secondary {
        background-color: var(--wordplay-warning);
    }
</style>