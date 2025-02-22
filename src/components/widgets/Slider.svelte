<script lang="ts">
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import { locales } from '@db/Database';
    import type {
        LocaleTextAccessor,
        LocaleTextsAccessor,
    } from '@locale/Locales';
    import { getFirstText } from '@locale/LocaleText';
    import Decimal from 'decimal.js';
    import { tick } from 'svelte';

    interface Props {
        value: number | undefined;
        min: number;
        max: number;
        unit: string;
        increment: number;
        label?: LocaleTextAccessor | undefined;
        tip: LocaleTextAccessor | LocaleTextsAccessor;
        change?: (value: Decimal) => void;
        release?: (value: number | undefined) => void;
        precision?: number;
        editable?: boolean;
        id?: string | undefined;
    }

    let {
        value = $bindable(),
        min,
        max,
        unit,
        increment,
        label = undefined,
        tip,
        change = undefined,
        release = undefined,
        precision = 0,
        editable = true,
        id = undefined,
    }: Props = $props();

    let view: HTMLInputElement | undefined = $state(undefined);
    let tooltip = $derived(getFirstText($locales.get(tip)));

    async function handleChange() {
        if (value !== undefined && change !== undefined)
            change(
                new Decimal(value)
                    // Add two digits of precision to percent units
                    .toDecimalPlaces(precision + (unit === '%' ? 2 : 0)),
            );
        await tick();
        if (view) setKeyboardFocus(view, 'Restoring focus after slider edit.');
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
    {#if label}
        <label for={id ?? 'label'}>{$locales.get(label)}</label>
    {/if}
    <input
        class="slider"
        type="range"
        aria-label={tooltip}
        title={tooltip}
        id={id ?? 'label'}
        {min}
        {max}
        step={increment}
        bind:value
        bind:this={view}
        oninput={handleChange}
        onpointerup={() => release?.(value)}
        disabled={!editable}
    />
    <div class="text">
        {#if value === undefined}
            ø
        {:else}
            {(value * (unit === '%' ? 100 : 1)).toFixed(
                Math.max(0, precision),
            ) + unit}
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
        flex: 1;
    }

    .slider {
        flex: 1;
    }

    label {
        font-style: italic;
        font-size: var(--wordplay-small-font-size);
    }

    .text {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        font-size: small;
        min-width: 3em;
    }

    input[type='range'] {
        height: 1em;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
        margin: 0 0;
        background: none;
        appearance: none;
        -webkit-appearance: none;
        /* Allow for it to be tiny */
        width: auto;
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
        background: var(--wordplay-focus-color);
    }

    input[type='range']::-moz-range-thumb {
        height: 1em;
        width: 1em;
        margin-top: -0.45em;
        background: var(--wordplay-foreground);
        border-radius: 50%;
    }
</style>
