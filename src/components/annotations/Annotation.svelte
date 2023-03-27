<script lang="ts">
    import { afterUpdate } from 'svelte';
    import { fade } from 'svelte/transition';
    import type { AnnotationInfo } from './Annotations.svelte';
    import DescriptionView from '@components/concepts/DescriptionView.svelte';
    import Speech from '../lore/Speech.svelte';
    import { getConceptIndex } from '../project/Contexts';
    import { getAnimationDuration } from '@models/stores';

    export let id: number;
    export let annotations: AnnotationInfo[];

    $: position = annotations[0].position;

    let index = getConceptIndex();

    let view: HTMLElement | undefined;

    // After the update, get the size of the annotation and make sure it's
    // within the window bounds so we don't get weird layout issues.
    let adjusted: { left: number; top: number } | undefined = undefined;
    afterUpdate(() => {
        if (view) {
            const rect = view.getBoundingClientRect();
            adjusted =
                position === undefined
                    ? undefined
                    : {
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

{#if position}
    <div
        class="annotations"
        class:measured={adjusted !== undefined}
        style:left={`${adjusted ? adjusted.left : position.left}px`}
        style:top={`${adjusted ? adjusted.top : position.top}px`}
        bind:this={view}
    >
        {#each annotations as annotation}
            <div
                class={`annotation ${annotation.kind}`}
                data-annotationid={id}
                transition:fade|local={getAnimationDuration()}
            >
                <Speech
                    glyph={annotation.node.getGlyphs()}
                    concept={$index?.getNodeConcept(annotation.node)}
                    invert
                >
                    {#each annotation.text as description}
                        <p>
                            <DescriptionView {description} />
                        </p>
                    {/each}
                </Speech>
            </div>
        {/each}
    </div>
{/if}

<style>
    .annotations {
        position: absolute;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        visibility: hidden;
    }

    .annotation {
        padding: var(--wordplay-spacing);
        background-color: var(--wordplay-error);
        color: var(--wordplay-background);
        box-shadow: -2px calc(2 * var(--wordplay-border-width))
            calc(2 * var(--wordplay-border-width)) rgba(0, 0, 0, 0.5);
        border-radius: var(--wordplay-border-radius);
    }

    .measured {
        visibility: visible;
    }

    :global(.animated) .measured {
        transition: left, ease-out right, ease-out;
        transition-duration: 200ms;
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
