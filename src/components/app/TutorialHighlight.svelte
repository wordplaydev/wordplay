<script lang="ts">
    import { onMount } from 'svelte';

    interface Props {
        // A class name to highlight.
        id?: string | undefined;
        highlightIndex: number | undefined;
    }

    let { id = undefined, highlightIndex = undefined }: Props = $props();

    let bounds: DOMRect | undefined = $state(undefined);

    function size(again: boolean) {
        if (id) {
            bounds = document
                .querySelector(`[data-uiid="${id}"]`)
                ?.getBoundingClientRect();
            // Try again in a few seconds, in case there's some async rendering.
            if (again && bounds === undefined)
                setTimeout(() => size(false), 2000);
        }
    }

    onMount(() => {
        size(true);
    });
</script>

<span
    class="highlight"
    class:hovering={id !== undefined}
    style:left={bounds ? `${bounds.left}px` : undefined}
    style:top={bounds ? `${bounds.top}px` : undefined}
>
    {#if highlightIndex}
        <span class="number">{highlightIndex}</span>
    {/if}
</span>

<style>
    .highlight {
        vertical-align: middle;
        display: inline-block;
        background-color: var(--wordplay-highlight-color);
        border-radius: 50%;
        width: 0.75em;
        height: 0.75em;
        margin-left: 0.1em;
        margin-right: 0.1em;
        animation-name: glow;
        animation-duration: 1s;
        animation-iteration-count: infinite;
        align-items: center;
    }

    .hovering {
        position: fixed;
        left: 0;
        top: 0;
        transform: translate(-50%, -50%);
        z-index: 2;
        pointer-events: none;
    }

    .number {
        color: #000;
        display: flex;
        justify-content: center;
        width: 100%;
        height: 100%;
        margin: 0;
        font-size: 0.6em;
        line-height: 1.2em;
        font-weight: bold;
    }

    @keyframes glow {
        from {
            transform: scale(1);
        }
        to {
            transform: scale(2);
        }
    }
</style>
