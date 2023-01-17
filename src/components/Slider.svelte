<script lang="ts">
    export let value: number | undefined;
    export let min: number;
    export let max: number;
    export let unit: string;
    export let increment: number;
    export let change: (value: number) => void;
    export let isDefault: boolean;
</script>

<div class="control">
    <input
        class="slider"
        type="range"
        {min}
        {max}
        step={increment}
        bind:value
        on:input={() => (value !== undefined ? change(value) : undefined)}
    />
    <div class="text" class:isDefault>
        {#if value === undefined}
            &mdash;
        {:else}
            {value + unit}
        {/if}
    </div>
</div>

<style>
    .control {
        white-space: nowrap;
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: center;
    }

    .slider {
        flex: 1;
    }

    .isDefault {
        color: var(--wordplay-disabled-color);
    }

    input[type='range'] {
        height: 1em;
        margin: 0 0;
        width: 5em;
        background: none;
    }

    /* Reset Remove main styling */
    input[type='range'] {
        appearance: none;
        -webkit-appearance: none;
    }

    input[type='range']:focus {
        outline: none;
    }

    input[type='range']::-webkit-slider-runnable-track {
        background: var(--wordplay-border-color);
        height: var(--wordplay-border-width);
    }

    input[type='range']::-moz-range-track {
        background: var(--wordplay-border-color);
        height: var(--wordplay-border-width);
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
