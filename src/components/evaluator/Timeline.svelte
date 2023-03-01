<script lang="ts">
    import { afterUpdate } from 'svelte';
    import { getAnimationDuration } from '@models/stores';
    import type Evaluator from '@runtime/Evaluator';
    import Keyboard from '../../input/Keyboard';
    import Bool from '@runtime/Bool';
    import MouseButton from '../../input/MouseButton';
    import { slide } from 'svelte/transition';
    import { tick } from 'svelte';
    import Exception from '@runtime/Exception';
    import {
        getCurrentStepIndex,
        getPlaying,
        getStreamChanges,
    } from '../project/Contexts';

    export let evaluator: Evaluator;

    let playing = getPlaying();
    let currentStepIndex = getCurrentStepIndex();
    let streams = getStreamChanges();

    let timeline: HTMLElement;

    // Find the latest stream change before the current step index.
    $: currentReaction = $currentStepIndex
        ? evaluator.getReactionPriorTo($currentStepIndex)
        : undefined;
    $: historyTrimmed =
        $currentStepIndex && evaluator.getEarliestStepIndexAvailable() > 0;
    let dragging = false;

    /**
     * The time position is the current left position within the timeline of the current step index of the evaluator.
     * We update it after we update/
     */
    let timePosition = 0;

    /** After each update, ensure the current change is in view */
    afterUpdate(updateScrollPosition);

    /** When the current step index changes, update the scroll position to make sure it's in view. */
    $: {
        $currentStepIndex;
        updateScrollPosition();
    }

    /** When the step index changes, update the time slider position */
    $: if ($currentStepIndex) updateTimePosition($currentStepIndex);

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
        timePosition = getTimePosition(stepIndex);
    }

    function getTimePosition(stepIndex: number) {
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
        if ($streams === undefined) return;

        // Map the mouse position onto a change.
        const view = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest('.event');
        if (view instanceof HTMLElement) {
            // Is this a stream input? Get it's index and step to it.
            if (view.dataset.inputindex !== undefined) {
                const index = parseInt(view.dataset.inputindex);
                const change = $streams.find(
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

<div
    transition:slide={getAnimationDuration()}
    class="timeline"
    class:stepping={!$playing}
    on:mousedown={(event) => stepToMouse(event)}
    on:mousemove={(event) =>
        (event.buttons & 1) === 1 ? stepToMouse(event) : undefined}
    on:mouseleave={() => (dragging = false)}
    on:mouseup={() => (dragging = false)}
    bind:this={timeline}
>
    {#if historyTrimmed}<span class="stream-input">…</span>{/if}
    {#if $streams}
        {#each $streams as reaction, index}
            <!-- Compute the number of steps that occurred between this and the next input, or if there isn't one, the latest step. -->
            {@const stepCount =
                (index < $streams.length - 1
                    ? $streams[index + 1].stepIndex
                    : evaluator.getStepCount()) - reaction.stepIndex}
            <!-- Show up to three of the streams that changed -->
            {#each reaction.changes.slice(0, 3) as change}
                {@const down =
                    change.stream instanceof Keyboard
                        ? change.value?.resolve('down')
                        : change.stream instanceof MouseButton
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
                    <!-- Show dots representing the steps after the reevaluation -->
                </span>
            {/each}
            <!-- If there were more than three, indicate the trimming -->
            {#if reaction.changes.length > 3}…{/if}
            <span
                class="event steps"
                data-startindex={reaction.stepIndex}
                data-endindex={reaction.stepIndex + stepCount}
                style:width="{Math.min(5, stepCount / 10)}em"
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
        ><span class="index">{$currentStepIndex}</span></div
    >
</div>

<style>
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

    :global(.animated) .stream-input {
        transition-property: font-size;
        transition-duration: 200ms;
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
    }

    .index {
        font-size: xx-small;
        color: currentColor;
        margin-left: var(--wordplay-spacing);
        margin-top: auto;
    }
</style>
