<script lang="ts">
    import { toStage } from '../../output/Stage';
    import Exception from '@runtime/Exception';
    import type Value from '@runtime/Value';
    import type Project from '@models/Project';
    import ValueView from '../values/ValueView.svelte';
    import type Source from '@nodes/Source';
    import StageView from './StageView.svelte';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';
    import Speech from '../lore/Speech.svelte';
    import {
        IdleKind,
        getConceptIndex,
        getEvaluation,
        getKeyboardEditIdle,
    } from '../project/Contexts';
    import type Evaluator from '@runtime/Evaluator';
    import type PaintingConfiguration from './PaintingConfiguration';
    import { creator } from '../../db/Creator';
    import concretize from '../../locale/concretize';

    export let project: Project;
    export let evaluator: Evaluator;
    export let source: Source;
    export let value: Value | undefined;
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

    $: verse = value === undefined ? undefined : toStage(project, value);
    $: background =
        $keyboardEditIdle === IdleKind.Idle && value instanceof Exception
            ? 'var(--wordplay-error)'
            : verse?.background.toCSS() ?? null;

    /** When creator's preferred animation factor changes, update evaluator */
    $: evaluator.updateTimeMultiplier($creator.getAnimationFactor());
</script>

<section
    class="output"
    data-uuid="stage"
    class:mini
    aria-label={$creator.getLocale().ui.section.output}
    style:direction={$creator.getWritingDirection()}
    style:writing-mode={$creator.getWritingLayout()}
>
    <!-- If it's because the keyboard isn't idle, show feedback instead of the value.-->
    {#if !mini && $evaluation?.playing === true && $keyboardEditIdle === IdleKind.Typing}
        <div class="message editing">⌨️</div>
        <!-- If there's an exception, show that. -->
    {:else if value instanceof Exception}
        <div class="message exception" data-uiid="exception"
            >{#if mini}!{:else}<Speech
                    glyph={$index?.getNodeConcept(value.creator) ??
                        value.creator.getGlyphs()}
                    invert
                    >{#each $creator.getLocales() as locale}
                        <!-- This is some strange Svelte error were a non-exception value is sneaking through. -->
                        {#if value instanceof Exception}
                            <MarkupHTMLView
                                markup={value.getExplanation(locale)}
                            />
                        {/if}
                    {/each}</Speech
                >{/if}
        </div>
        <!-- If there's no verse -->
    {:else if value === undefined}
        <div class="message evaluating">◆</div>
        <!-- If there's a value, but it's not a verse, show that -->
    {:else if verse === undefined}
        <div class="message">
            {#if mini}
                <ValueView {value} interactive={false} />
            {:else}
                <h2
                    >{$creator
                        .getLocales()
                        .map((translation) =>
                            value === undefined
                                ? undefined
                                : value
                                      .getType(project.getContext(source))
                                      .getDescription(
                                          concretize,
                                          translation,
                                          project.getContext(source)
                                      )
                                      .toText()
                        )}</h2
                >
                <p><ValueView {value} /></p>
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
        width: 100%;
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
