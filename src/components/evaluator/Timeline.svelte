<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import Subheader from '@components/app/Subheader.svelte';
    import {
        StepBack,
        StepBackInput,
        StepBackNode,
        StepForward,
        StepForwardInput,
        StepForwardNode,
        StepOut,
        StepToPresent,
        StepToStart,
    } from '@components/editor/commands/Commands';
    import Controls from '@components/evaluator/Controls.svelte';
    import { getEvaluation } from '@components/project/Contexts';
    import ButtonWidget from '@components/widgets/Button.svelte';
    import CommandButton from '@components/widgets/CommandButton.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import OverflowToolbar from '@components/widgets/OverflowToolbar.svelte';
    import Tour, { type UIExplanation } from '@components/widgets/Tour.svelte';
    import { animationDuration, locales, Settings } from '@db/Database';
    import Button from '@input/Button';
    import Key from '@input/Key';
    import { DEFECT_SYMBOL, INFO_SYMBOL } from '@parser/Symbols';
    import type Evaluator from '@runtime/Evaluator';
    import BoolValue from '@values/BoolValue';
    import ExceptionValue from '@values/ExceptionValue';
    import StructureValue from '@values/StructureValue';
    import { tick, untrack } from 'svelte';
    import { slide } from 'svelte/transition';

    interface Props {
        /** The evaluator running the program */
        evaluator: Evaluator;
    }

    let { evaluator }: Props = $props();

    let evaluation = getEvaluation();

    /** When true, the Tour overlay is shown. */
    let touring = $state(false);

    /** The sequence of explanations shown by the Tour, by `data-uiid`. */
    const tourExplanations: UIExplanation[] = [
        {
            uiid: 'timelinePanel',
            explanation: (l) => l.ui.timeline.tour.timeline,
        },
        {
            uiid: 'timelineReset',
            explanation: (l) => l.ui.timeline.tour.reset,
        },
        {
            uiid: 'playToggle',
            explanation: (l) => l.ui.timeline.tour.playMode,
            onEnter: () => evaluator.play(),
        },
        {
            uiid: 'playToggle',
            explanation: (l) => l.ui.timeline.tour.pauseMode,
            onEnter: () => {
                evaluator.pause();
                // Expand the annotations window so the next step's target
                // and the program's values are visible.
                Settings.setShowAnnotations(true);
            },
        },
        {
            uiid: 'conflict',
            explanation: (l) => l.ui.timeline.tour.annotations,
        },
        { uiid: 'editor', explanation: (l) => l.ui.timeline.tour.editor },
        { uiid: 'timeline', explanation: (l) => l.ui.timeline.tour.history },
        {
            uiid: 'stepControls',
            explanation: (l) => l.ui.timeline.tour.stepControls,
        },
    ];

    /** The view of the timeline, for dragging calculations. */
    let timeline = $state<HTMLElement | undefined>();

    // Find the latest stream change before the current step index.
    let currentReaction = $derived(
        $evaluation?.stepIndex !== undefined
            ? evaluator.getReactionPriorTo($evaluation.stepIndex)
            : undefined,
    );
    const historyTrimmed = $derived(
        $evaluation?.stepIndex !== undefined &&
            evaluator.getEarliestStepIndexAvailable() > 0,
    );

    /** Whether the timeline is being dragged*/
    let dragging = $state(false);

    /**
     * The time position is the current left position within the timeline of the current step index of the evaluator.
     * We update it after we update.
     */
    let timePosition = $state(0);

    /** After each update, ensure the current change is in view */
    $effect(() => {
        currentReaction;
        untrack(() => {
            tick().then(() => updateScrollPosition());
        });
    });

    /** When the current step index changes, update the scroll position to make sure it's in view. */
    $effect(() => {
        $evaluation;
        if (currentReaction !== undefined) updateScrollPosition();
    });

    /** When the step index changes, update the time slider position */
    $effect(() => {
        if ($evaluation?.stepIndex !== undefined)
            updateTimePosition($evaluation.stepIndex);
    });

    function updateScrollPosition() {
        if (currentReaction === undefined || dragging) return;

        dragging = false;

        const el = document.querySelector(
            `.stream-input[data-inputindex="${currentReaction.stepIndex}"]`,
        );
        // Move the timeline's scroll left such that the element is in the center.
        if (el && timeline) {
            const timelineRect = timeline.getBoundingClientRect();
            const changeRect = el.getBoundingClientRect();
            const position =
                changeRect.left - timelineRect.left + timeline.scrollLeft;
            timeline.scrollLeft = position - timelineRect.width / 2;
        }
    }

    async function updateTimePosition(stepIndex: number) {
        // Wait for any pending updates
        await tick();
        timePosition = getTimePosition(stepIndex) ?? 0;
    }

    function getTimePosition(stepIndex: number) {
        if (!timeline) return;

        // Get all of the input and step views
        const views = timeline.querySelectorAll('.event');

        // Find the view that contains the step
        for (const view of views) {
            if (view instanceof HTMLElement) {
                if (
                    view.dataset.exceptionindex &&
                    parseInt(view.dataset.exceptionindex) === stepIndex
                ) {
                    return view.offsetLeft + view.clientWidth / 2;
                } else if (
                    view.dataset.inputindex &&
                    parseInt(view.dataset.inputindex) === stepIndex
                ) {
                    return view.offsetLeft + view.clientWidth / 2;
                } else if (
                    view.dataset.startindex !== undefined &&
                    view.dataset.endindex !== undefined &&
                    stepIndex >= parseInt(view.dataset.startindex) &&
                    (stepIndex < parseInt(view.dataset.endindex) ||
                        (stepIndex === evaluator.getStepCount() &&
                            stepIndex === parseInt(view.dataset.endindex)))
                ) {
                    const start = parseInt(view.dataset.startindex);
                    const end = parseInt(view.dataset.endindex);
                    return (
                        view.offsetLeft +
                        (view.clientWidth * (stepIndex - start)) / (end - start)
                    );
                }
            }
        }
        console.error(`Uh oh, no time position for ${stepIndex}...`);
        return 0;
    }

    function stepToPointer(event: PointerEvent) {
        if ($evaluation?.streams === undefined) return;
        if (timeline === undefined) return;

        // Map the pointer's x position to the closest event. Use viewport
        // coordinates from getBoundingClientRect, since elementFromPoint expects
        // them and offsetTop is relative to the offset parent, not the viewport.
        const rect = timeline.getBoundingClientRect();
        const view = document
            .elementFromPoint(event.clientX, rect.top + rect.height / 2)
            ?.closest('.event');
        if (view instanceof HTMLElement) {
            // Is this a stream input? Get it's index and step to it.
            if (view.dataset.inputindex !== undefined) {
                const index = parseInt(view.dataset.inputindex);
                const change = $evaluation.streams.find(
                    (change) => change.stepIndex === index,
                );
                if (change) evaluator.stepTo(change.stepIndex);
            }
            // Is this an exception step?
            else if (view.dataset.exceptionindex !== undefined) {
                const index = parseInt(view.dataset.exceptionindex);
                evaluator.stepTo(index);
            }
            // Is this a series of steps? Choose one proportional to the mouse offset.
            else if (
                view.dataset.startindex !== undefined &&
                view.dataset.endindex !== undefined
            ) {
                const start = parseInt(view.dataset.startindex);
                const end = parseInt(view.dataset.endindex);
                const viewRect = view.getBoundingClientRect();
                const percent =
                    (event.clientX - viewRect.left) / viewRect.width;
                const step = Math.min(
                    end,
                    Math.max(0, Math.round(percent * (end - start) + start)),
                );
                evaluator.stepTo(step);
            }
        }

        // If we're on the edge, autoscroll.
        if (timeline) {
            dragging = true;
            const offset = event.clientX - rect.left;
            const width = rect.width;
            if (offset < 50) timeline.scrollLeft = timeline.scrollLeft - 10;
            else if (offset > width - 50)
                timeline.scrollLeft = timeline.scrollLeft + 10;
        }
    }

    function handleKey(event: KeyboardEvent) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown')
            evaluator.stepBackWithinProgram();
        else if (event.key === 'ArrowRight' || event.key === 'ArrowUp')
            evaluator.stepWithinProgram();
        else if (event.key === 'Home') evaluator.stepTo(0);
        else if (event.key === 'End') evaluator.stepToEnd();
        else if (event.key === 'PageUp') evaluator.stepToInput();
        else if (event.key === 'PageDown') evaluator.stepBackToInput();
    }
</script>

<section
    class="evaluation"
    aria-label={$locales.getPlainText((l) => l.ui.timeline.label)}
    class:stepping={$evaluation?.playing === false}
    data-uiid="timelinePanel"
>
    {#snippet timelineHeader()}
        <Subheader compact
            ><Emoji text={DEFECT_SYMBOL} />
            <LocalizedText path={(l) => l.ui.timeline.debug} /></Subheader
        >
        <ButtonWidget
            tip={(l) => l.ui.timeline.tour.launch}
            background="circular"
            padding={false}
            uiid="debugtour"
            icon={INFO_SYMBOL}
            action={() => (touring = true)}
        ></ButtonWidget>
        {#if touring}
            <Tour
                explanations={tourExplanations}
                subheader={(l) => l.ui.timeline.debug}
                close={() => (touring = false)}
            />
        {/if}
    {/snippet}

    {#snippet timelinePlayback()}
        {#if $evaluation}
            <Controls {evaluator} steps={false} />
        {/if}
    {/snippet}

    {#snippet timelineSlider()}
        {#if $evaluation}
            <div
                role="slider"
                transition:slide|local={{ duration: $animationDuration }}
                class="timeline"
                tabindex={0}
                data-uiid="timeline"
                aria-label={$locales.getPlainText((l) => l.ui.timeline.slider)}
                aria-valuemin={0}
                aria-valuemax={$evaluation.evaluator.getStepCount()}
                aria-valuenow={$evaluation.stepIndex}
                aria-valuetext={$evaluation.step
                    ? $evaluation.step
                          .getExplanations($locales, evaluator)
                          .toText()
                    : $evaluation.stepIndex + ''}
                aria-orientation="horizontal"
                class:stepping={$evaluation.playing === false}
                onpointerdown={(event) => {
                    stepToPointer(event);
                    timeline?.setPointerCapture(event.pointerId);
                }}
                onpointermove={(event) =>
                    dragging && (event.buttons & 1) === 1
                        ? stepToPointer(event)
                        : undefined}
                onpointerleave={() => (dragging = false)}
                onpointerup={(event) => {
                    dragging = false;
                    timeline?.releasePointerCapture(event.pointerId);
                }}
                onkeydown={handleKey}
                bind:this={timeline}
            >
                {#if historyTrimmed}<span class="stream-input">…</span>{/if}
                {#if $evaluation.streams !== undefined}
                    {#each $evaluation.streams as reaction, index}
                        <!-- Compute the number of steps that occurred between this and the next input, or if there isn't one, the latest step. -->
                        {@const stepCount =
                            (index < $evaluation.streams.length - 1
                                ? $evaluation.streams[index + 1].stepIndex
                                : evaluator.getStepCount()) -
                            reaction.stepIndex}
                        <!-- Show up to three of the streams that changed -->
                        {#each reaction.changes.slice(0, 3) as change}
                            {@const down =
                                change.stream instanceof Key &&
                                change.value instanceof StructureValue
                                    ? change.value.resolve(
                                          change.value.type.inputs[1].names,
                                      )
                                    : change.stream instanceof Button
                                      ? change.value
                                      : undefined}
                            <!-- Show an emoji representing the cause of the reevaluation -->
                            <span
                                class={`event stream-input ${
                                    currentReaction === reaction
                                        ? 'current'
                                        : ''
                                } ${
                                    down instanceof BoolValue && down.bool
                                        ? 'down'
                                        : ''
                                }`}
                                data-inputindex={reaction.stepIndex}
                            >
                                {#if change.stream === undefined}
                                    ◆
                                {:else}
                                    {change.stream.definition.names.getEmojiName()}
                                {/if}
                            </span>
                        {:else}
                            <!-- Represent the program start when there are no reactions-->
                            <span
                                class={`event stream-input ${
                                    currentReaction === reaction
                                        ? 'current'
                                        : ''
                                }`}
                                data-inputindex={reaction.stepIndex}
                            >
                                ◆
                            </span>
                        {/each}
                        <!-- If there were more than three, indicate the trimming -->
                        {#if reaction.changes.length > 3}…{/if}
                        <!-- Show dots representing the steps after the reevaluation -->
                        <div
                            class="event steps"
                            data-startindex={reaction.stepIndex}
                            data-endindex={reaction.stepIndex + stepCount}
                            style:width="{Math.min(2, stepCount / 10)}em"
                            >&ZeroWidthSpace;</div
                        >
                        <!-- If the value was an exception, show that it ended that way -->
                        {#if evaluator.getSourceValueBefore(evaluator.getMain(), reaction.stepIndex + stepCount) instanceof ExceptionValue}<span
                                data-exceptionindex={reaction.stepIndex +
                                    stepCount}
                                class="event exception">!</span
                            >{/if}
                    {/each}
                {/if}
                <!-- Render the time slider -->
                <div class="time" style:left="{timePosition}px"
                    ><span class="index">{$evaluation.stepIndex}</span></div
                >
            </div>
        {/if}
    {/snippet}

    <!-- Individual step buttons — each is its own item so they overflow one by one. -->
    <!-- Anchor the `stepControls` UI reference (tutorial highlight + debug tour) on the leftmost,
         most overflow-stable step button, since the step buttons are separate toolbar items with no
         group wrapper to carry the data-uiid. -->
    {#snippet stepToStart()}<CommandButton
            command={StepToStart}
            uiid="stepControls"
        />{/snippet}
    {#snippet stepBackInput()}<CommandButton
            command={StepBackInput}
        />{/snippet}
    {#snippet stepBackNode()}<CommandButton command={StepBackNode} />{/snippet}
    {#snippet stepBack()}<CommandButton command={StepBack} />{/snippet}
    {#snippet stepOut()}<CommandButton command={StepOut} />{/snippet}
    {#snippet stepForward()}<CommandButton command={StepForward} />{/snippet}
    {#snippet stepForwardNode()}<CommandButton
            command={StepForwardNode}
        />{/snippet}
    {#snippet stepForwardInput()}<CommandButton
            command={StepForwardInput}
        />{/snippet}
    {#snippet stepToPresent()}<CommandButton
            command={StepToPresent}
        />{/snippet}

    <OverflowToolbar
        items={[
            timelineHeader,
            timelinePlayback,
            stepToStart,
            stepBackInput,
            stepBackNode,
            stepBack,
            stepOut,
            stepForward,
            stepForwardNode,
            stepForwardInput,
            stepToPresent,
        ]}
        stretchy={timelineSlider}
        stretchyMin={64}
    />
</section>

<style>
    .evaluation {
        background: var(--wordplay-background);
        border-top: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: center;
        gap: var(--wordplay-spacing);
        width: 100%;
    }

    .evaluation.stepping {
        background-color: var(--wordplay-evaluation-color);
        color: var(--wordplay-background);
        border-bottom: none;
    }

    .timeline {
        flex: 1 1 0%;
        min-width: 0;
        overflow-x: hidden;
        position: relative;
        white-space: nowrap;
        user-select: none;
        cursor: pointer;
        border-inline-start: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
        padding-inline-start: var(--wordplay-spacing);
        padding-inline-end: var(--wordplay-spacing);
    }

    .timeline:focus {
        border-radius: var(--wordplay-border-radius);
    }

    .stream-input {
        display: inline-block;
    }

    .stream-input {
        transition-property: font-size;
        transition-duration: calc(var(--animation-factor) * 200ms);
    }

    .stream-input.down {
        transform-origin: bottom;
        transform: scaleY(0.8);
    }

    .steps {
        display: inline-block;
        height: 100%;
    }

    .steps:after {
        content: '';
        display: inline-block;
        width: 100%;
        position: relative;
        inset-inline-start: 0;
        top: 0;
        border-bottom: 1px dotted currentColor;
    }

    .time {
        position: absolute;
        top: 0;
        height: 100%;
        border-inline-start: currentColor solid 2px;
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        pointer-events: none;
    }

    .index {
        font-size: xx-small;
        color: currentColor;
        margin-inline-start: var(--wordplay-spacing);
        margin-top: auto;
    }
</style>
