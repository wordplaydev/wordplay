<script lang="ts">
    import { afterUpdate } from 'svelte';
    import { fade } from 'svelte/transition';
    import type { Description } from '../translation/Translation';
    import DescriptionView from './DescriptionView.svelte';

    export let id: number;
    export let text: Description[];
    export let position: { left: number; top: number };
    export let kind: 'step' | 'primary' | 'secondary' | 'minor';

    let view: HTMLElement | undefined;

    // After the update, get the size of the annotation and make sure it's
    // within the window bounds so we don't get weird layout issues.
    let adjusted: { left: number; top: number } | undefined = undefined;
    afterUpdate(() => {
        if (view) {
            const rect = view.getBoundingClientRect();
            adjusted = {
                left:
                    position.left + rect.width > window.innerWidth
                        ? window.innerWidth - rect.width
                        : position.left,
                top:
                    position.top + rect.height > window.innerHeight
                        ? window.innerHeight - rect.height
                        : position.top,
            };
        }
    });
</script>

<div
    class={`annotation ${kind}`}
    class:measured={adjusted !== undefined}
    data-annotationid={id}
    transition:fade={{ duration: 100 }}
    style:left={`${adjusted ? adjusted.left : 0}px`}
    style:top={`${adjusted ? adjusted.top : 0}px`}
    bind:this={view}
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
        background-color: var(--wordplay-error);
        color: var(--wordplay-background);
        box-shadow: -2px calc(2 * var(--wordplay-border-width))
            calc(2 * var(--wordplay-border-width)) rgba(0, 0, 0, 0.5);
        max-width: 320px;
        border-radius: var(--wordplay-border-radius);
        z-index: 1;
    }

    .measured {
        visibility: visible;
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
