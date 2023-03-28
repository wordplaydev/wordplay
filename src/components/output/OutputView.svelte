<script lang="ts">
    import { toVerse } from '../../output/Verse';
    import Exception from '@runtime/Exception';
    import type Value from '@runtime/Value';
    import KeyboardIdle from '../editor/util/KeyboardIdle';
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
    import { getConceptIndex, getEvaluation } from '../project/Contexts';
    import type Evaluator from '@runtime/Evaluator';

    export let project: Project;
    export let evaluator: Evaluator;
    export let source: Source;
    export let latest: Value | undefined;
    export let fullscreen: boolean;
    export let fit: boolean = true;
    export let grid: boolean = false;
    export let mode: 'mini' | 'peripheral';
    export let background: string | null = null;

    let index = getConceptIndex();
    let evaluation = getEvaluation();

    $: verse = latest === undefined ? undefined : toVerse(latest);
    $: background = verse?.background.toCSS() ?? null;
</script>

<section
    class={`output ${mode}`}
    aria-label={$preferredTranslations[0].ui.section.output}
    class:mode
    tabIndex={mode === 'peripheral' ? 0 : null}
    style:direction={$writingDirection}
    style:writing-mode={$writingLayout}
>
    <!-- Render the verse, or whatever value we get -->
    <div class="value">
        <!-- If there's an exception, show that. -->
        {#if latest instanceof Exception}
            {#key latest}
                <div class="fill exception"
                    ><div class="message"
                        ><Speech
                            glyph={latest.creator.getGlyphs()}
                            concept={$index?.getNodeConcept(latest.creator)}
                            invert
                            >{#each $preferredTranslations as translation}
                                <DescriptionView
                                    description={latest.getDescription(
                                        translation
                                    )}
                                />
                            {/each}</Speech
                        >
                    </div></div
                >
            {/key}
            <!-- If there's no verse -->
        {:else if latest === undefined}
            <!-- If it's because the keyboard isn't idle, show the typing feedback.-->
            {#if $evaluation?.playing === true && !$KeyboardIdle}
                <div class="fill editing"><div class="message">⌨️</div></div>
            {:else}
                <div class="fill evaluating"><div class="message">◆</div></div>
            {/if}
            <!-- If there's a value, but it's not a verse, show that -->
        {:else if verse === undefined}
            <div class="fill value">
                <div class="message">
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
                </div>
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
                interactive={mode !== 'mini' && source === project.main}
                editable={mode === 'peripheral' &&
                    $evaluation?.playing === false}
            />
        {/if}
    </div>
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

    .value {
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1;
        width: 100%;
        height: 100%;
    }

    .mini {
        position: static;
        box-shadow: none;
        background-color: var(--wordplay-background);
    }

    .fill {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .fill .message {
        width: 100%;
        height: auto;
        padding: var(--wordplay-spacing);
        text-align: center;
        line-height: 100%;
        font-size: 48pt;
        transform-origin: center;
    }

    :global(.animated) .editing .message {
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
</style>
