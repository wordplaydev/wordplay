<script lang="ts">
    import { fade } from 'svelte/transition';
    import type { AnnotationInfo } from './Annotations.svelte';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import Speech from '../lore/Speech.svelte';
    import { Projects, animationDuration, locales } from '../../db/Database';
    import Button from '@components/widgets/Button.svelte';
    import MarkupHtmlView from '../concepts/MarkupHTMLView.svelte';
    import type { Resolution } from '@conflicts/Conflict';
    import type Context from '@nodes/Context';

    interface Props {
        id: number;
        annotations: AnnotationInfo[];
    }

    let { id, annotations }: Props = $props();

    function resolveAnnotation(resolution: Resolution, context: Context) {
        const { newProject } = resolution.mediator(context, $locales);
        Projects.reviseProject(newProject);
    }
</script>

<div class="annotations">
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
                glyph={annotation.node.getGlyphs($locales)}
                flip={annotation.kind === 'secondary'}
                below
            >
                {#snippet content()}
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
                {/snippet}
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
        padding-inline-start: none;
        border-inline-start: none;
        padding-inline-end: var(--wordplay-spacing);
        border-inline-end: var(--wordplay-focus-width) solid
            var(--wordplay-error);
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
    }
</style>
