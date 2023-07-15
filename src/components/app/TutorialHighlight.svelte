<script lang="ts">
    import { onMount } from 'svelte';

    // A class name to highlight.
    export let id: string | undefined = undefined;

    let bounds: DOMRect | undefined = undefined;

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
/>

<style>
    .highlight {
        vertical-align: middle;
        display: inline-block;
        background-color: var(--wordplay-highlight);
        border-radius: 50%;
        width: 0.75em;
        height: 0.75em;
        margin-left: 0.1em;
        margin-right: 0.1em;
        animation-name: glow;
        animation-duration: 1s;
        animation-iteration-count: infinite;
    }

    .hovering {
        position: fixed;
        left: 0;
        top: 0;
        transform: translate(-50%, -50%);
        z-index: 2;
        pointer-events: none;
    }

    @keyframes glow {
        from {
            transform: scale(1);
        }
        to {
            transform: scale(2);
            opacity: 0.5;
        }
    }
</style>
