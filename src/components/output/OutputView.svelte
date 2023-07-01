<script lang="ts">
    import { toStage } from '../../output/Stage';
    import Exception from '@runtime/Exception';
    import type Value from '@runtime/Value';
    import type Project from '@models/Project';
    import ValueView from '../values/ValueView.svelte';
    import type Source from '@nodes/Source';
    import StageView from './StageView.svelte';
    import DescriptionView from '@components/concepts/DescriptionView.svelte';
    import Speech from '../lore/Speech.svelte';
    import {
        getConceptIndex,
        getEvaluation,
        getKeyboardEditIdle,
    } from '../project/Contexts';
    import type Evaluator from '@runtime/Evaluator';
    import type PaintingConfiguration from './PaintingConfiguration';
    import { creator } from '../../db/Creator';

    export let project: Project;
    export let evaluator: Evaluator;
    export let source: Source;
    export let latest: Value | undefined;
    export let fullscreen: boolean;
    export let fit: boolean = true;
    export let grid: boolean = false;
    export let painting: boolean = false;
    export let paintingConfig: PaintingConfiguration | undefined = undefined;
    export let mini: boolean = false;
    export let background: string | null = null;

    let index = getConceptIndex();
    let evaluation = getEvaluation();
    let keyboardEditIdle = getKeyboardEditIdle();

    $: verse = latest === undefined ? undefined : toStage(latest);
    $: background =
        $keyboardEditIdle && latest instanceof Exception
            ? 'var(--wordplay-error)'
            : verse?.background.toCSS() ?? null;
</script>

<section
    class="output"
    class:mini
    aria-label={$creator.getLocale().ui.section.output}
    style:direction={$creator.getWritingDirection()}
    style:writing-mode={$creator.getWritingLayout()}
>
    <!-- Render the verse, or whatever value we get -->
    <!-- If there's an exception, show that. -->
    <!-- If it's because the keyboard isn't idle, show the typing feedback.-->
    {#if !mini && $evaluation?.playing === true && !$keyboardEditIdle}
        <div class="message editing">⌨️</div>
    {:else if latest instanceof Exception}
        <div class="message exception"
            >{#if mini}!{:else}<Speech
                    glyph={latest.creator.getGlyphs()}
                    concept={$index?.getNodeConcept(latest.creator)}
                    invert
                    >{#each $creator.getLocales() as translation}
                        <DescriptionView
                            description={latest.getDescription(translation)}
                        />
                    {/each}</Speech
                >{/if}
        </div>
        <!-- If there's no verse -->
    {:else if latest === undefined}
        <div class="message evaluating">◆</div>
        <!-- If there's a value, but it's not a verse, show that -->
    {:else if verse === undefined}
        <div class="message">
            {#if mini}
                <ValueView value={latest} interactive={false} />
            {:else}
                <h2
                    >{$creator
                        .getLocales()
                        .map((translation) =>
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
        <!-- Otherwise, show the Stage -->
    {:else}
        <StageView
            {project}
            {evaluator}
            {verse}
            {fullscreen}
            bind:fit
            bind:grid
            bind:painting
            {paintingConfig}
            interactive={!mini && source === project.main}
            editable={!mini && $evaluation?.playing === false}
        />
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
        transition: ease-in, width ease-in, height ease-in;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    .mini {
        position: static;
        box-shadow: none;
        background-color: var(--wordplay-background);
        pointer-events: none;
        touch-action: none;
    }

    .message {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        max-height: 100%;
        padding: var(--wordplay-spacing);
        text-align: center;
        line-height: 100%;
        font-size: 48pt;
        transform-origin: center;
        justify-content: center;
        align-items: center;
    }

    .editing {
        animation: jiggle ease-out infinite;
        animation-duration: calc(var(--animation-factor) * 0.2s);
    }

    @keyframes jiggle {
        0% {
            transform: rotate(-1deg) translate(0, 0);
        }
        25% {
            transform: rotate(2deg) translate(0, -1px);
        }
        50% {
            transform: rotate(-3deg) translate(0, 2px);
        }
        75% {
            transform: rotate(-1deg) translate(0, -1px);
        }
        100% {
            transform: rotate(2deg) translate(0, 1px);
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
