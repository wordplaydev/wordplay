<script lang="ts">
    export let value: number | undefined;
    export let min: number;
    export let max: number;
    export let unit: string;
    export let increment: number;
    export let change: (value: number) => void;
    export let isDefault: boolean;
    export let precision: number = 0;

    function handleChange() {
        if (value !== undefined) change(value);
    }
</script>

<div class="component">
    <input
        class="slider"
        type="range"
        {min}
        {max}
        step={increment}
        bind:value
        on:mousedown|stopPropagation
        on:input={handleChange}
    />
    <div class="text" class:isDefault>
        {#if value === undefined}
            ø
        {:else}
            {value.toFixed(precision) + unit}
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
        height: 2em;
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

    .isDefault {
        color: var(--wordplay-disabled-color);
    }

    input[type='range'] {
        height: auto;
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
        background: var(--wordplay-border-color);
        height: calc(2 * var(--wordplay-border-width));
    }

    input[type='range']::-moz-range-track {
        background: var(--wordplay-border-color);
        height: calc(2 * var(--wordplay-border-width));
    }

    input[type='range']::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: 1em;
        width: 1em;
        margin-top: -0.4em;
        background: var(--wordplay-foreground);
        border-radius: 50%;
    }

    input[type='range']:focus::-webkit-slider-thumb {
        background: var(--wordplay-highlight);
    }

    input[type='range']::-moz-range-thumb {
        height: 1em;
        width: 1em;
        margin-top: -0.4em;
        background: var(--wordplay-foreground);
        border-radius: 50%;
    }
</style>
