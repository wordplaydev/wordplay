<script lang="ts">
    import { getEditors } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type {
        ConflictLocaleAccessor,
        Resolution,
    } from '@conflicts/Conflict';
    import type Context from '@nodes/Context';
    import { CONFIRM_SYMBOL, SEARCH_SYMBOL } from '@parser/Symbols';
    import { fade } from 'svelte/transition';
    import { Projects, animationDuration, locales } from '../../db/Database';
    import { default as MarkupHTMLView } from '../concepts/MarkupHTMLView.svelte';
    import Speech from '../lore/Speech.svelte';
    import type { AnnotationInfo } from './Annotations.svelte';

    interface Props {
        id: number;
        annotations: AnnotationInfo[];
        /** The tile ID this corresponds to */
        sourceID: string;
    }

    let { id, annotations, sourceID }: Props = $props();

    // Get the editor this corresponds to.
    const editors = getEditors();
    let editor = $derived($editors.get(sourceID));

    function resolveAnnotation(resolution: Resolution, context: Context) {
        const { newProject } = resolution.mediator(context, $locales);
        Projects.reviseProject(newProject);
    }
</script>

<div class="annotations">
    {#each annotations as annotation}
        {@const secondary =
            annotation.kind === 'secondaryMajor' ||
            annotation.kind === 'secondaryMinor'}
        {#if annotation.conflict}
            <h3>
                {#if editor}
                    <Button
                        icon={SEARCH_SYMBOL}
                        tip={(l) => l.ui.annotations.button.highlight}
                        action={() => {
                            editor.setCaretPosition(annotation.node);
                        }}
                    ></Button>
                {/if}
                <LocalizedText
                    path={(l) =>
                        (annotation.conflict as ConflictLocaleAccessor)(l).name}
                ></LocalizedText>
            </h3>
        {/if}
        <div
            class={`annotation ${annotation.kind} ${secondary ? 'flip' : ''}`}
            data-annotationid={id}
            transition:fade|local={{
                duration: $animationDuration,
            }}
        >
            <Speech
                character={annotation.node.getCharacter($locales)}
                flip={secondary}
                below
            >
                {#snippet content()}
                    {#each annotation.messages as markup}
                        <aside aria-label={markup.toText()}>
                            <MarkupHTMLView {markup} />
                            {#each annotation.resolutions as resolution}
                                <div class="resolution">
                                    <Button
                                        background
                                        tip={(l) =>
                                            l.ui.annotations.button.resolution}
                                        action={() =>
                                            resolveAnnotation(
                                                resolution,
                                                annotation.context,
                                            )}>{CONFIRM_SYMBOL}</Button
                                    ><div class="description"
                                        ><MarkupHTMLView
                                            inline
                                            markup={resolution.description(
                                                $locales,
                                                annotation.context,
                                            )}
                                        /></div
                                    >
                                </div>
                            {/each}
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

    .annotation.primaryMajor,
    .annotation.secondaryMajor {
        border-color: var(--wordplay-error);
    }

    .annotation.primaryMinor,
    .annotation.secondaryMinor {
        border-color: var(--wordplay-warning);
    }

    .annotation.secondary {
        font-size: var(--wordplay-small-font-size);
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

    h3 {
        margin-block-end: 0;
    }
</style>
