<script lang="ts">
    import { toVerse } from '../../output/Verse';
    import Exception from '@runtime/Exception';
    import type Value from '@runtime/Value';
    import type Project from '@models/Project';
    import ValueView from '../values/ValueView.svelte';
    import type Source from '@nodes/Source';
    import VerseView from './VerseView.svelte';
    import DescriptionView from '@components/concepts/DescriptionView.svelte';
    import {
        preferredTranslations,
        writingDirection,
        writingLayout,
    } from '@translation/translations';
    import Speech from '../lore/Speech.svelte';
    import {
        getConceptIndex,
        getEvaluation,
        getKeyboardIdle,
    } from '../project/Contexts';
    import type Evaluator from '@runtime/Evaluator';
    import Controls from '../evaluator/Controls.svelte';
    import Timeline from '../evaluator/Timeline.svelte';

    export let project: Project;
    export let evaluator: Evaluator;
    export let source: Source;
    export let latest: Value | undefined;
    export let fullscreen: boolean;
    export let fit: boolean = true;
    export let grid: boolean = false;
    export let mini: boolean = false;
    export let background: string | null = null;

    let index = getConceptIndex();
    let evaluation = getEvaluation();
    let keyboardIdle = getKeyboardIdle();

    $: verse = latest === undefined ? undefined : toVerse(latest);
    $: background =
        latest instanceof Exception
            ? 'var(--wordplay-error)'
            : verse?.background.toCSS() ?? null;
</script>

<section
    class="output"
    class:mini
    aria-label={$preferredTranslations[0].ui.section.output}
    tabIndex={!mini ? 0 : null}
    style:direction={$writingDirection}
    style:writing-mode={$writingLayout}
>
    <!-- Render the verse, or whatever value we get -->
    <!-- If there's an exception, show that. -->
    {#if latest instanceof Exception}
        {#key latest}
            <div class="message exception"
                >{#if mini}!{:else}<Speech
                        glyph={latest.creator.getGlyphs()}
                        concept={$index?.getNodeConcept(latest.creator)}
                        invert
                        >{#each $preferredTranslations as translation}
                            <DescriptionView
                                description={latest.getDescription(translation)}
                            />
                        {/each}</Speech
                    >{/if}
            </div>
        {/key}
        <!-- If there's no verse -->
    {:else if latest === undefined}
        <!-- If it's because the keyboard isn't idle, show the typing feedback.-->
        {#if $evaluation?.playing === true && !$keyboardIdle}
            <div class="message editing">⌨️</div>
        {:else}
            <div class="message evaluating">◆</div>
        {/if}
        <!-- If there's a value, but it's not a verse, show that -->
    {:else if verse === undefined}
        <div class="message">
            {#if mini}
                <ValueView value={latest} />
            {:else}
                <h2
                    >{$preferredTranslations.map((translation) =>
                        latest === undefined
                            ? undefined
                            : latest
                                  .getType(project.getContext(source))
                                  .getDescription(
                                      translation,
                                      project.getContext(source)
                                  )
                    )}</h2
                >
                <p><ValueView value={latest} /></p>
            {/if}
        </div>
        <!-- Otherwise, show the Verse -->
    {:else}
        <VerseView
            {project}
            {evaluator}
            {verse}
            {fullscreen}
            bind:fit
            bind:grid
            interactive={!mini && source === project.main}
            editable={!mini && $evaluation?.playing === false}
        />
    {/if}
    {#if !fullscreen && !mini}
        <section
            class="evaluation"
            aria-label={$preferredTranslations[0].ui.section.timeline}
            class:stepping={$evaluation?.playing === false}
        >
            <Controls {project} {evaluator} />
            <Timeline {evaluator} />
        </section>
    {/if}
</section>

<style>
    .output {
        transform-origin: top right;

        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        position: relative;

        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    :global(.animated) .output {
        transition: ease-in, width ease-in, height ease-in;
        transition-duration: 200ms;
    }

    .mini {
        position: static;
        box-shadow: none;
        background-color: var(--wordplay-background);
        pointer-events: none;
    }

    .message {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: auto;
        padding: var(--wordplay-spacing);
        text-align: center;
        line-height: 100%;
        font-size: 48pt;
        transform-origin: center;
        flex-grow: 1;
        justify-content: center;
        align-items: center;
    }

    :global(.animated) .editing {
        animation: jiggle ease-out infinite;
        animation-duration: 0.2s;
    }

    @keyframes jiggle {
        0% {
            transform: rotate(-4deg) translate(0, 0);
        }
        25% {
            transform: rotate(6deg) translate(0, -1px);
        }
        50% {
            transform: rotate(-8deg) translate(0, 2px);
        }
        75% {
            transform: rotate(-2deg) translate(0, -4px);
        }
        100% {
            transform: rotate(4deg) translate(0, 1px);
        }
    }

    .exception {
        color: var(--wordplay-background);
        background-color: var(--wordplay-error);
    }

    .exception :global(.value) {
        color: var(--wordplay-evaluation-color);
    }

    .evaluation {
        background: var(--wordplay-background);
        border-bottom: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        width: 100%;
    }

    .evaluation.stepping {
        background-color: var(--wordplay-evaluation-color);
        color: var(--wordplay-background);
        border-bottom: none;
    }
</style>
