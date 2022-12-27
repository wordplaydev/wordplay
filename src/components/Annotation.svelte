<script lang="ts">
    import { fade } from "svelte/transition";

    export let text: string;
    export let position: { left: number, top: number }
    export let kind: "step" | "primary" | "secondary"

    // Find the position of the node and show it's explanation
</script>

<div
    class={`annotation ${kind}`}
    transition:fade={{ duration: 100 }}
    style:left={`${position.left}px`}
    style:top={`${position.top}px`}
>
    {text}
</div>

<style>
    .annotation {
        position: absolute;
        padding: var(--wordplay-spacing);
        z-index: var(--wordplay-layer-annotation);
        background-color: var(--wordplay-error);
        color: var(--wordplay-background);
        box-shadow: -2px calc(2 * var(--wordplay-border-width)) calc(2 * var(--wordplay-border-width)) rgba(0,0,0,.5);
        max-width: 20em;
        border-radius: var(--wordplay-border-radius);
        transition: left, right, 0.25s ease-out;
    }

    .step {
        background-color: var(--wordplay-evaluation-color);
    }

    .secondary {
        background-color: var(--wordplay-error);
    }

    .secondary {
        background-color: var(--wordplay-warning);
    }
</style>