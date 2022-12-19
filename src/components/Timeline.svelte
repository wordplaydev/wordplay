<script lang="ts">
    import { afterUpdate } from "svelte";
    import { streams } from "../models/stores";
    import Bool from "../runtime/Bool";
    import type Evaluator from "../runtime/Evaluator";
    import Text from "../runtime/Text";
    import Keyboard from "../streams/Keyboard";
    import MouseButton from "../streams/MouseButton";

    export let evaluator: Evaluator;

    let timeline: HTMLElement;

    afterUpdate(() => timeline ? timeline.scrollLeft = timeline.scrollWidth : undefined);

    function stepTo(stepIndex: number) {
        evaluator.pause();
        evaluator.stepTo(stepIndex);
    }

    $: nonEmptyStreams = $streams.filter(s => s.stream !== undefined);

</script>

{#if nonEmptyStreams.length > 0}
    <div class="timeline" bind:this={timeline}>
        {#each $streams as change }
            {#if change.stream}
                <span 
                    class={`stream-value`}
                    tabIndex="0" 
                    on:click={() => stepTo(change.stepIndex)}
                    on:keydown={event => event.key === "Enter" || event.key === " " ? stepTo(change.stepIndex) : undefined }
                >
                    {change.stream.names.getTranslation("😀")}
                    {#if change.stream instanceof Keyboard && change.value}
                        {@const key = change.value.resolve("key")}
                        {@const down = change.value.resolve("down")}
                        {key instanceof Text ? key.text : null}{down instanceof Bool ? (down.bool ? "↓" : "↑") : null}
                    {/if}
                    {#if change.stream instanceof MouseButton && change.value}
                        {change.value instanceof Bool ? (change.value.bool ? "↓" : "↑") : null}
                    {/if}
                </span>
            {/if}
        {/each}
    </div>
{/if}

<style>
    .timeline {
        overflow-x: scroll;
        width: 100%;
        white-space: nowrap;
        padding: var(--wordplay-spacing);
        background-color: var(--wordplay-executing-color);
        color: var(--wordplay-background);
    }

    .stream-value {
        display: inline-block;
        font-size: 60%;
        transition: font-size .25s;
        margin-right: var(--wordplay-spacing);
    }

    .stream-value:hover {
        cursor: pointer;
        font-size: 100%;
    }

</style>