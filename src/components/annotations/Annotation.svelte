<script lang="ts">
    import { fade } from 'svelte/transition';
    import type { AnnotationInfo } from './Annotations.svelte';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import Speech from '../lore/Speech.svelte';
    import { getConceptIndex } from '../project/Contexts';
    import { Projects, animationDuration, locales } from '../../db/Database';
    import Button from '@components/widgets/Button.svelte';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import type { Resolution } from '@conflicts/Conflict';
    import type Context from '@nodes/Context';

    export let id: number;
    export let annotations: AnnotationInfo[];

    let index = getConceptIndex();

    function resolveAnnotation(resolution: Resolution, context: Context) {
        Projects.reviseProject(resolution.mediator(context));
    }
</script>

<div class="annotations" data-uiid="conflict">
    {#each annotations as annotation}
        <div
            class={`annotation ${annotation.kind} ${
                annotation.kind === 'secondary' ? 'flip' : ''
            }`}
            data-annotationid={id}
            transition:fade|local={{
                duration: $animationDuration,
            }}
        >
            <Speech
                glyph={$index?.getNodeConcept(annotation.node) ??
                    annotation.node.getGlyphs()}
                flip={annotation.kind === 'secondary'}
                below
            >
                <svelte:fragment slot="content">
                    {#each annotation.messages as markup}
                        <aside aria-label={markup.toText()}>
                            <MarkupHTMLView {markup} />
                            {#if annotation.resolutions}
                                {#each annotation.resolutions as resolution}
                                    <div class="resolution">
                                        <Button
                                            background
                                            tip={$locales.get(
                                                (l) =>
                                                    l.ui.annotations.button
                                                        .resolution,
                                            )}
                                            action={() =>
                                                resolveAnnotation(
                                                    resolution,
                                                    annotation.context,
                                                )}>✓</Button
                                        ><div class="description"
                                            ><MarkupHtmlView
                                                inline
                                                markup={resolution.description(
                                                    $locales,
                                                    annotation.context,
                                                )}
                                            /></div
                                        >
                                    </div>
                                {/each}
                            {/if}
                        </aside>
                    {/each}
                </svelte:fragment>
            </Speech>
        </div>
    {/each}
</div>

<style>
    .annotations {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
        padding-block-start: var(--wordplay-spacing);
        align-items: flex-start;
    }

    .annotation {
        padding-inline-start: var(--wordplay-spacing);
        border-inline-start: var(--wordplay-focus-width) solid
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

    aside {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .resolution {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: center;
    }

    .description {
        padding: var(--wordplay-spacing);
        border-radius: var(--wordplay-spacing);
        background: var(--wordplay-error);
        color: var(--wordplay-background);
    }
</style>
