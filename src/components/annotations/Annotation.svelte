<script lang="ts">
    import { fade } from 'svelte/transition';
    import type { AnnotationInfo } from './Annotations.svelte';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import Speech from '../lore/Speech.svelte';
    import { getConceptIndex } from '../project/Contexts';
    import { creator } from '../../db/Creator';

    export let id: number;
    export let annotations: AnnotationInfo[];

    let index = getConceptIndex();
</script>

<div class="annotations" data-uiid="conflict">
    {#each annotations as annotation}
        <div
            class={`annotation conflict ${annotation.kind}`}
            data-annotationid={id}
            transition:fade|local={{
                duration: $creator.getAnimationDuration(),
            }}
        >
            <Speech
                glyph={$index?.getNodeConcept(annotation.node) ??
                    annotation.node.getGlyphs()}
            >
                {#each annotation.messages as markup}
                    <MarkupHTMLView {markup} />
                {/each}
            </Speech>
        </div>
    {/each}
</div>

<style>
    .annotations {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
    }

    .annotation {
        padding-left: var(--wordplay-spacing);
        border-left: var(--wordplay-border-radius) solid var(--wordplay-error);
        border-top-right-radius: var(--wordplay-border-radius);
        border-bottom-right-radius: var(--wordplay-border-radius);
    }

    .annotation.step {
        border-color: var(--wordplay-evaluation-color);
    }

    .annotation.primary {
        border-color: var(--wordplay-error);
    }

    .annotation.secondary,
    .annotation.minor {
        border-color: var(--wordplay-warning);
    }
</style>
