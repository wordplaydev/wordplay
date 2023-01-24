<script lang="ts">
    import { afterUpdate } from 'svelte';
    import { streams } from '../models/stores';
    import type Evaluator from '../runtime/Evaluator';
    import { currentStepIndex } from '../models/stores';
    import Keyboard from '../streams/Keyboard';
    import Bool from '../runtime/Bool';
    import MouseButton from '../streams/MouseButton';
    import Text from '../runtime/Text';
    import { slide } from 'svelte/transition';
    import Controls from './Controls.svelte';
    import { preferredLanguages } from '../translation/translations';
    import { playing } from '../models/stores';

    export let evaluator: Evaluator;

    let timeline: HTMLElement;

    // Find the latest stream change before the current step index.
    $: currentChange = evaluator.getChangePriorTo($currentStepIndex);
    $: historyTrimmed =
        $currentStepIndex && evaluator.getEarliestStepIndexAvailable() > 0;
    let keyboardNavigation = false;

    // After each update, ensure the current change is in view
    afterUpdate(() => {
        if (currentChange === undefined || !keyboardNavigation) return;

        keyboardNavigation = false;

        const el = document.querySelector(
            `.stream-value[data-index="${currentChange.stepIndex}"]`
        );
        // Move the timeline's scroll left such that the element is in the center.
        if (el && timeline) {
            const timelineRect = timeline.getBoundingClientRect();
            const changeRect = el.getBoundingClientRect();
            const position =
                changeRect.left - timelineRect.left + timeline.scrollLeft;
            timeline.scrollLeft = position - timelineRect.width / 2;
        }
    });

    function stepToMouse(event: MouseEvent) {
        // Map the mouse position onto a change.
        const el = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest('.stream-value');
        if (el instanceof HTMLElement && el.dataset.index !== undefined) {
            const index = parseInt(el.dataset.index);
            const change = $streams.find(
                (change) => change.stepIndex === index
            );
            if (change) stepTo(change.stepIndex);
        }

        // If we're on the edge, autoscroll.
        if (timeline) {
            const rect = timeline.getBoundingClientRect();
            const offset = event.clientX - rect.left;
            const width = rect.width;
            if (offset < 50) timeline.scrollLeft = timeline.scrollLeft - 10;
            else if (offset > width - 50)
                timeline.scrollLeft = timeline.scrollLeft + 10;
        }
    }

    /** Step before or after the current change. */
    function leap(direction: -1 | 1) {
        if (currentChange === undefined && direction < 0) return;

        const change = $streams.find(
            (_, index) =>
                index - direction >= 0 &&
                index - direction < $streams.length &&
                $streams[index - direction] === currentChange
        );
        if (change) {
            keyboardNavigation = true;
            stepTo(change.stepIndex);
        }
    }

    function stepTo(stepIndex: number) {
        evaluator.pause();
        evaluator.stepTo(stepIndex);
    }
</script>

<section class="timeline" transition:slide class:stepping={!$playing}>
    <Controls project={evaluator.project} />
    <div
        class="inputs"
        tabIndex="0"
        on:keydown={(event) =>
            event.key === 'ArrowLeft'
                ? leap(-1)
                : event.key === 'ArrowRight'
                ? leap(1)
                : undefined}
        on:mousedown={(event) => stepToMouse(event)}
        on:mousemove={(event) =>
            (event.buttons & 1) === 1 ? stepToMouse(event) : undefined}
        bind:this={timeline}
    >
        {#if historyTrimmed}<span class="stream-value">…</span>{/if}
        {#each $streams as change}
            {@const down =
                change.stream instanceof Keyboard
                    ? change.value?.resolve('down')
                    : change.stream instanceof MouseButton
                    ? change.value
                    : undefined}
            <span
                class={`stream-value ${
                    currentChange === change ? 'current' : ''
                } ${down instanceof Bool && down.bool ? 'down' : ''}`}
                data-index={change.stepIndex}
            >
                {#if change.stream === undefined}
                    ◆
                {:else}
                    {change.stream.names.getTranslation('😀')}
                {/if}
            </span>
        {/each}
        <div class="description">
            {#if historyTrimmed && currentChange === $streams[0]}
                Can't remember before this…
            {:else if currentChange && currentChange.stream}
                {#each $preferredLanguages as lang}
                    {currentChange.stream.docs.getTranslation(lang)}
                {/each}
            {/if}
        </div>
    </div>
</section>

<style>
    .timeline {
        padding: var(--wordplay-spacing);
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        flex: 1;
    }

    .timeline.stepping {
        background-color: var(--wordplay-evaluation-color);
        color: var(--wordplay-background);
    }

    .inputs {
        overflow-x: hidden;
        position: relative;
        white-space: nowrap;
        user-select: none;
        cursor: pointer;
        border-left: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
        padding: var(--wordplay-spacing);
    }

    .stream-value {
        display: inline-block;
        transition: font-size 0.25s;
        opacity: 0.6;
    }

    .stream-value.current {
        opacity: 1;
    }

    .stream-value.down {
        transform-origin: bottom;
        transform: scaleY(0.8);
    }
</style>
