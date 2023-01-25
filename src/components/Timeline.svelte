<script lang="ts">
    import { afterUpdate } from 'svelte';
    import { streams } from '../models/stores';
    import type Evaluator from '../runtime/Evaluator';
    import { currentStepIndex } from '../models/stores';
    import Keyboard from '../streams/Keyboard';
    import Bool from '../runtime/Bool';
    import MouseButton from '../streams/MouseButton';
    import { slide } from 'svelte/transition';
    import { playing } from '../models/stores';
    import { tick } from 'svelte';
    import Exception from '../runtime/Exception';

    export let evaluator: Evaluator;

    let timeline: HTMLElement;

    // Find the latest stream change before the current step index.
    $: currentChange = evaluator.getChangePriorTo($currentStepIndex);
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
    $: updateTimePosition($currentStepIndex);

    function updateScrollPosition() {
        if (currentChange === undefined || dragging) return;

        dragging = false;

        const el = document.querySelector(
            `.stream-input[data-inputindex="${currentChange.stepIndex}"]`
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
    transition:slide
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
    {#each $streams as change, index}
        {@const down =
            change.stream instanceof Keyboard
                ? change.value?.resolve('down')
                : change.stream instanceof MouseButton
                ? change.value
                : undefined}
        <!-- Compute the number of steps that occurred between this and the next input, or if there isn't one, the latest step. -->
        {@const stepCount =
            (index < $streams.length - 1
                ? $streams[index + 1].stepIndex
                : evaluator.getStepCount()) - change.stepIndex}
        <!-- Show an emoji representing the cause of the reevaluation -->
        <span
            class={`event stream-input ${
                currentChange === change ? 'current' : ''
            } ${down instanceof Bool && down.bool ? 'down' : ''}`}
            data-inputindex={change.stepIndex}
        >
            {#if change.stream === undefined}
                ◆
            {:else}
                {change.stream.names.getTranslation('😀')}
            {/if}
            <!-- Show dots representing the steps after the reevaluation -->
        </span><span
            class="event steps"
            data-startindex={change.stepIndex}
            data-endindex={change.stepIndex + stepCount}
            style:width="{stepCount / 10}px">&ZeroWidthSpace;</span
        >
        <!-- If the value was an exception, show that it ended that way -->
        {#if evaluator.getSourceValueBefore(evaluator.getMain(), change.stepIndex + stepCount) instanceof Exception}<span
                data-exceptionindex={change.stepIndex + stepCount}
                class="event exception">!</span
            >{/if}
    {/each}
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
        transition: font-size 0.25s;
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
