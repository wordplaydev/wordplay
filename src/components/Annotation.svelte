<script lang="ts">
    import { fade } from 'svelte/transition';
    import type { Description } from '../translation/Translation';
    import DescriptionView from './DescriptionView.svelte';

    export let id: number;
    export let text: Description[];
    export let position: { left: number; top: number };
    export let kind: 'step' | 'primary' | 'secondary' | 'minor';
</script>

<div
    class={`annotation ${kind}`}
    data-annotationid={id}
    transition:fade={{ duration: 100 }}
    style:left={`${position.left}px`}
    style:top={`${position.top}px`}
>
    {#each text as description}
        <p>
            <DescriptionView {description} />
        </p>
    {/each}
</div>

<style>
    .annotation {
        position: absolute;
        padding: var(--wordplay-spacing);
        z-index: var(--wordplay-layer-annotation);
        background-color: var(--wordplay-error);
        color: var(--wordplay-background);
        box-shadow: -2px calc(2 * var(--wordplay-border-width))
            calc(2 * var(--wordplay-border-width)) rgba(0, 0, 0, 0.5);
        max-width: 20em;
        border-radius: var(--wordplay-border-radius);
        transition: left, right, 0.25s ease-out;
    }

    .annotation.step {
        background-color: var(--wordplay-evaluation-color);
    }

    .annotation.primary {
        background-color: var(--wordplay-error);
    }

    .annotation.secondary,
    .annotation.minor {
        background-color: var(--wordplay-warning);
    }
</style>
