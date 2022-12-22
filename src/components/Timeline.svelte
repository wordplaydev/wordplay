<script lang="ts">
    import { afterUpdate } from "svelte";
    import { streams } from "../models/stores";
    import type Evaluator from "../runtime/Evaluator";
    import { currentStepIndex } from "../models/stores";
    import Keyboard from "../streams/Keyboard";
    import Bool from "../runtime/Bool";
    import MouseButton from "../streams/MouseButton";
    import Text from "../runtime/Text";

    export let evaluator: Evaluator;

    let timeline: HTMLElement;

    // Find the latest stream change before the current step index.
    $: currentChange = evaluator.getChangePriorTo($currentStepIndex);
    $: historyTrimmed = $currentStepIndex && evaluator.getEarliestStepIndexAvailable() > 0;
    let keyboardNavigation = false;

    // After each update, ensure the current change is in view
    afterUpdate(() => {
        
        if(currentChange === undefined || !keyboardNavigation) return;
        
        keyboardNavigation = false;

        const el = document.querySelector(`.stream-value[data-index="${currentChange.stepIndex}"]`)
        // Move the timeline's scroll left such that the element is in the center.
        if(el && timeline) {
            const timelineRect = timeline.getBoundingClientRect();
            const changeRect = el.getBoundingClientRect();
            const position = changeRect.left - timelineRect.left + timeline.scrollLeft;
            timeline.scrollLeft = position - timelineRect.width / 2;
        }

    });

    function stepToMouse(event: MouseEvent) {

        // Map the mouse position onto a change.
        const el = document.elementFromPoint(event.clientX, event.clientY)?.closest(".stream-value");
        if(el instanceof HTMLElement && el.dataset.index !== undefined) {
            const index = parseInt(el.dataset.index);
            const change = $streams.find(change => change.stepIndex === index);
            if(change)
                stepTo(change.stepIndex);
        }

        // If we're on the edge, autoscroll.
        if(timeline) {
            const rect = timeline.getBoundingClientRect();
            const offset = event.clientX - rect.left;
            const width = rect.width;
            if(offset < 50)
                timeline.scrollLeft = timeline.scrollLeft - 10;
            else if(offset > width - 50)
                timeline.scrollLeft = timeline.scrollLeft + 10;

        }

    }

    /** Step before or after the current change. */
    function leap(direction: -1 | 1) {

        if(currentChange === undefined && direction < 0) 
            return;

        const change = $streams.find((_, index) => ((index - direction >= 0) && (index - direction) < $streams.length) && $streams[index - direction] === currentChange)
        if(change) {
            keyboardNavigation = true;
            stepTo(change.stepIndex);
        }

    }

    function stepTo(stepIndex: number) {

        evaluator.pause();
        evaluator.stepTo(stepIndex);
    }

    $: nonEmptyStreams = $streams.filter(s => s.stream !== undefined);

</script>

{#if nonEmptyStreams.length > 0}
    <section class="reactions">
        <p class="description">
            {#if historyTrimmed && currentChange === $streams[0]}
                Can't remember before this…
            {:else if currentChange.stream}
                {currentChange.stream.docs.getTranslations().eng}
            {/if}
        </p>
        <div 
            class="timeline" 
            tabIndex="0"
            on:keydown={event => event.key === "ArrowLeft" ? leap(-1) : event.key === "ArrowRight" ? leap(1) : undefined }
            on:mousedown={event => stepToMouse(event) }
            on:mousemove={event => (event.buttons & 1) === 1 ? stepToMouse(event) : undefined}
            bind:this={timeline}
        >
            {#if historyTrimmed}<span class="stream-value">…</span>{/if}
            {#each $streams as change }
                {@const down = change.stream instanceof Keyboard ? change.value?.resolve("down") : change.stream instanceof MouseButton ? change.value : undefined }
                <span 
                    class={`stream-value ${currentChange === change ? "current" : ""} ${down instanceof Bool && down.bool ? "down" : "" }`}
                    data-index={change.stepIndex}
                >
                    {#if change.stream === undefined}
                        →
                    {:else}
                        {#if change.stream instanceof Keyboard && change.value}
                            {@const key = change.value.resolve("key")}
                            {#if key instanceof Text}{key.text}{/if}
                        {:else}
                            {change.stream.names.getTranslation("😀")}
                        {/if}
                    {/if}
                </span>
            {/each}
        </div>
    </section>
{/if}

<style>

    .reactions {
        padding: var(--wordplay-spacing);
        background-color: var(--wordplay-executing-color);
        color: var(--wordplay-background);
    }

    .timeline {
        overflow-x: hidden;
        position: relative;
        width: 100%;
        white-space: nowrap;
        user-select: none;
        cursor: pointer;
    }

    .timeline:focus {
        outline: var(--wordplay-highlight) solid var(--wordplay-border-width);
    }

    .stream-value {
        display: inline-block;
        transition: font-size .25s;
        opacity: 0.6;
    }

    .stream-value.current {
        opacity: 1.0;
    }

    .stream-value.down {
        transform-origin: bottom;
        transform: scaleY(0.5);
    }

</style>