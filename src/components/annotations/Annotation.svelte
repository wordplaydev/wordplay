<script lang="ts">
    import { fade } from 'svelte/transition';
    import type { AnnotationInfo } from './Annotations.svelte';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import Speech from '../lore/Speech.svelte';
    import { getConceptIndex } from '../project/Contexts';
    import { config } from '../../db/Creator';

    export let id: number;
    export let annotations: AnnotationInfo[];

    let index = getConceptIndex();
</script>

<div class="annotations" data-uiid="conflict">
    {#each annotations as annotation}
        <div
            class={`annotation ${annotation.kind} ${
                annotation.kind === 'secondary' ? 'flip' : ''
            }`}
            data-annotationid={id}
            transition:fade|local={{
                duration: $config.getAnimationDuration(),
            }}
        >
            <Speech
                glyph={$index?.getNodeConcept(annotation.node) ??
                    annotation.node.getGlyphs()}
                flip={annotation.kind === 'secondary'}
            >
                {#each annotation.messages as markup}
                    <aside aria-label={markup.toText()}>
                        <MarkupHTMLView {markup} />
                    </aside>
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
        align-items: flex-start;
    }

    .annotation {
        padding-inline-start: var(--wordplay-spacing);
        border-inline-start: var(--wordplay-border-radius) solid
            var(--wordplay-error);
    }

    .annotation.flip {
        align-self: flex-end;
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
