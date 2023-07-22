<script lang="ts">
    import { tick } from 'svelte';

    export let value: number | undefined;
    export let min: number;
    export let max: number;
    export let unit: string;
    export let increment: number;
    export let change: (value: number) => void;
    export let precision: number = 0;

    let view: HTMLInputElement | undefined = undefined;

    async function handleChange() {
        if (value !== undefined) change(value);
        await tick();
        view?.focus();
    }
</script>

<div class="component">
    <!-- 
        Add a zero width space to ensure that when sliders are in a 
        flex that is aligned by baseline, it properly aligns.
        Without this, it takes the bottom of the slider, which
        makes it vertically off center.
    -->
    &#8203;
    <input
        class="slider"
        type="range"
        {min}
        {max}
        step={increment}
        bind:value
        bind:this={view}
        on:input={handleChange}
    />
    <div class="text">
        {#if value === undefined}
            ø
        {:else}
            {value.toFixed(Math.max(0, precision)) + unit}
        {/if}
    </div>
</div>

<style>
    .component {
        white-space: nowrap;
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: center;
        height: 1em;
        width: 100%;
    }

    .slider {
        flex: 1;
    }

    .text {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        font-size: small;
    }

    input[type='range'] {
        height: 1em;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
        margin: 0 0;
        /* width: 5em; */
        background: none;
        appearance: none;
        -webkit-appearance: none;
        /* Allow for it to be tiny */
        min-width: 2em;
    }

    input[type='range']:focus {
        outline: none;
    }

    input[type='range']::-webkit-slider-runnable-track {
        background: none;
        height: var(--wordplay-border-width);
    }

    input[type='range']::-moz-range-track {
        background: none;
        height: var(--wordplay-border-width);
    }

    input[type='range']::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 1em;
        width: 1em;
        margin-top: -0.45em;
        background: var(--wordplay-foreground);
        border-radius: 50%;
    }

    input[type='range']:focus::-webkit-slider-thumb {
        background: var(--wordplay-highlight);
    }

    input[type='range']::-moz-range-thumb {
        height: 1em;
        width: 1em;
        margin-top: -0.45em;
        background: var(--wordplay-foreground);
        border-radius: 50%;
    }
</style>
