<script lang="ts">
    import { afterUpdate } from 'svelte';
    import type Evaluator from '@runtime/Evaluator';
    import Key from '../../input/Key';
    import Bool from '@runtime/Bool';
    import Button from '../../input/Button';
    import { slide } from 'svelte/transition';
    import { tick } from 'svelte';
    import Exception from '@runtime/Exception';
    import { getEvaluation } from '../project/Contexts';
    import Controls from './Controls.svelte';
    import { config } from '../../db/Creator';
    import Structure from '../../runtime/Structure';

    export let evaluator: Evaluator;

    let evaluation = getEvaluation();

    let timeline: HTMLElement | null;

    // Find the latest stream change before the current step index.
    $: currentReaction =
        $evaluation?.stepIndex !== undefined
            ? evaluator.getReactionPriorTo($evaluation.stepIndex)
            : undefined;
    $: historyTrimmed =
        $evaluation?.stepIndex !== undefined &&
        evaluator.getEarliestStepIndexAvailable() > 0;
    let dragging = false;

    /**
     * The time position is the current left position within the timeline of the current step index of the evaluator.
     * We update it after we update.
     */
    let timePosition = 0;

    /** After each update, ensure the current change is in view */
    afterUpdate(updateScrollPosition);

    /** When the current step index changes, update the scroll position to make sure it's in view. */
    $: {
        $evaluation;
        if (currentReaction !== undefined) updateScrollPosition();
    }

    /** When the step index changes, update the time slider position */
    $: if ($evaluation?.stepIndex !== undefined)
        updateTimePosition($evaluation.stepIndex);

    function updateScrollPosition() {
        if (currentReaction === undefined || dragging) return;

        dragging = false;

        const el = document.querySelector(
            `.stream-input[data-inputindex="${currentReaction.stepIndex}"]`
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

    function stepToMouse(event: MouseEvent) {
        if ($evaluation?.streams === undefined) return;

        // Map the mouse position onto a change.
        const view = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest('.event');
        if (view instanceof HTMLElement) {
            // Is this a stream input? Get it's index and step to it.
            if (view.dataset.inputindex !== undefined) {
                const index = parseInt(view.dataset.inputindex);
                const change = $evaluation.streams.find(
                    (change) => change.stepIndex === index
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
                const percent = event.offsetX / view.offsetWidth;
                const step = Math.min(
                    end,
                    Math.max(0, Math.round(percent * (end - start) + start))
                );
                evaluator.stepTo(step);
            }
        }

        // If we're on the edge, autoscroll.
        if (timeline) {
            dragging = true;
            const rect = timeline.getBoundingClientRect();
            const offset = event.clientX - rect.left;
            const width = rect.width;
            if (offset < 50) timeline.scrollLeft = timeline.scrollLeft - 10;
            else if (offset > width - 50)
                timeline.scrollLeft = timeline.scrollLeft + 10;
        }
    }
</script>

<section
    class="evaluation"
    aria-label={$config.getLocale().ui.section.timeline}
    class:stepping={$evaluation?.playing === false}
>
    <Controls {evaluator} />
    <header
        transition:slide|local={{ duration: $config.getAnimationDuration() }}
        class="timeline"
        data-uiid="timeline"
        class:stepping={$evaluation?.playing === false}
        on:pointerdown={(event) => stepToMouse(event)}
        on:pointermove={(event) =>
            (event.buttons & 1) === 1 ? stepToMouse(event) : undefined}
        on:pointerleave={() => (dragging = false)}
        on:pointerup={() => (dragging = false)}
        bind:this={timeline}
    >
        {#if historyTrimmed}<span class="stream-input">…</span>{/if}
        {#if $evaluation?.streams !== undefined}
            {#each $evaluation.streams as reaction, index}
                <!-- Compute the number of steps that occurred between this and the next input, or if there isn't one, the latest step. -->
                {@const stepCount =
                    (index < $evaluation.streams.length - 1
                        ? $evaluation.streams[index + 1].stepIndex
                        : evaluator.getStepCount()) - reaction.stepIndex}
                <!-- Show up to three of the streams that changed -->
                {#each reaction.changes.slice(0, 3) as change}
                    {@const down =
                        change.stream instanceof Key &&
                        change.value instanceof Structure
                            ? change.value.resolve(
                                  change.value.type.inputs[1].names
                              )
                            : change.stream instanceof Button
                            ? change.value
                            : undefined}
                    <!-- Show an emoji representing the cause of the reevaluation -->
                    <span
                        class={`event stream-input ${
                            currentReaction === reaction ? 'current' : ''
                        } ${down instanceof Bool && down.bool ? 'down' : ''}`}
                        data-inputindex={reaction.stepIndex}
                    >
                        {#if change.stream === undefined}
                            ◆
                        {:else}
                            {change.stream.getName(['😀'])}
                        {/if}
                    </span>
                {:else}
                    <!-- Represent the program start when there are no reactions-->
                    <span
                        class={`event stream-input ${
                            currentReaction === reaction ? 'current' : ''
                        }`}
                        data-inputindex={reaction.stepIndex}
                    >
                        ◆
                    </span>
                {/each}
                <!-- If there were more than three, indicate the trimming -->
                {#if reaction.changes.length > 3}…{/if}
                <!-- Show dots representing the steps after the reevaluation -->
                <span
                    class="event steps"
                    data-startindex={reaction.stepIndex}
                    data-endindex={reaction.stepIndex + stepCount}
                    style:width="{Math.min(2, stepCount / 10)}em"
                    >&ZeroWidthSpace;</span
                >
                <!-- If the value was an exception, show that it ended that way -->
                {#if evaluator.getSourceValueBefore(evaluator.getMain(), reaction.stepIndex + stepCount) instanceof Exception}<span
                        data-exceptionindex={reaction.stepIndex + stepCount}
                        class="event exception">!</span
                    >{/if}
            {/each}
        {/if}
        <!-- Render the time slider -->
        <div class="time" style:left="{timePosition}px"
            ><span class="index">{$evaluation?.stepIndex}</span></div
        >
    </header>
</section>

<style>
    .evaluation {
        background: var(--wordplay-background);
        border-top: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
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

    .timeline {
        flex: 1;
        overflow-x: hidden;
        position: relative;
        white-space: nowrap;
        user-select: none;
        cursor: pointer;
        border-left: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
        padding-left: var(--wordplay-spacing);
        padding-right: var(--wordplay-spacing);
    }

    .timeline:focus {
        outline-offset: calc(-1 * var(--wordplay-focus-width));
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
        margin-left: var(--wordplay-spacing);
        margin-right: var(--wordplay-spacing);
    }

    .steps:after {
        content: '';
        display: inline-block;
        width: 100%;
        position: relative;
        left: 0;
        top: 0;
        border-bottom: 1px dotted currentColor;
    }

    .time {
        position: absolute;
        top: 0;
        height: 100%;
        border-left: currentColor solid 2px;
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        pointer-events: none;
    }

    .index {
        font-size: xx-small;
        color: currentColor;
        margin-left: var(--wordplay-spacing);
        margin-top: auto;
    }
</style>
