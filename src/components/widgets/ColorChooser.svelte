<script context="module" lang="ts">
    import ColorJS from 'colorjs.io';
    import Slider from './Slider.svelte';
    // Create a list of hues in the LCH color space from 0 to 360
    function getColors(lightness: number, chroma: number) {
        const values = [];
        for (let hue = 0; hue < 360; hue += 10) values.push(hue);
        return values.map((hue) =>
            new ColorJS(
                ColorJS.spaces.lch,
                [lightness, chroma, hue],
                1
            ).display()
        );
    }

    const MaxChroma = 150;

    /** 0-1 => 0-359 */
    function percentToHue(percent: number) {
        return 360 * Math.max(0, Math.min(1, percent));
    }

    /** 0-359 => 0-1 */
    function hueToPercent(hue: number) {
        return hue / 360;
    }

    /** 0-1 => 0-100 */
    function percentToChroma(percent: number) {
        return MaxChroma * Math.sqrt(Math.max(0, Math.min(1, percent)));
    }

    function chromaToPercent(value: number) {
        return Math.pow(value / MaxChroma, 2);
    }

    const Bands = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0].map(
        (val) => percentToChroma(val)
    );
</script>

<script lang="ts">
    import { creator } from '../../db/Creator';
    import { getFirstName } from '../../locale/Locale';

    /** a degree (any number remainder 360) */
    export let hue: number;
    /** any positive value to infinity */
    export let chroma: number;
    /** 0-100 */
    export let lightness: number;
    /** A handler */
    export let change: (l: number, c: number, h: number) => void;

    $: color = new ColorJS(ColorJS.spaces.lch, [lightness, chroma, hue], 1);

    let hueWidth: number | undefined = undefined;
    let hueHeight: number | undefined = undefined;
    function handleMouseMove(event: MouseEvent) {
        if (
            event.buttons !== 1 ||
            hueWidth === undefined ||
            hueHeight === undefined
        )
            return;
        hue = Math.round(percentToHue(event.offsetX / hueWidth));
        chroma = Math.round(percentToChroma(1 - event.offsetY / hueHeight));
        broadcast();
    }

    function broadcast() {
        change(lightness, chroma, hue);
    }
</script>

<div class="component">
    <div
        class="bands"
        on:pointerdown={handleMouseMove}
        on:pointermove={handleMouseMove}
        bind:clientWidth={hueWidth}
        bind:clientHeight={hueHeight}
    >
        {#each Bands as val}
            <div
                class="band"
                style:height="{100 / Bands.length}%"
                style:background="linear-gradient(to right, {getColors(
                    lightness,
                    val
                ).join(', ')})"
            />
        {/each}

        <div
            class="selection"
            style:left="{hueToPercent(hue) * hueWidth}px"
            style:top="{(1 - chromaToPercent(chroma)) * hueHeight}px"
        />
    </div>
    <div class="slider">
        <Slider
            value={lightness}
            min={0}
            max={100}
            increment={1}
            tip={getFirstName(
                $creator.getLocale().output.Color.lightness.names
            )}
            unit={'%'}
            change={(value) => {
                lightness = Math.round(value);
                broadcast();
            }}
        />
        <Slider
            value={chroma}
            min={0}
            max={150}
            increment={1}
            unit=""
            tip={getFirstName($creator.getLocale().output.Color.chroma.names)}
            change={(value) => {
                chroma = Math.round(value);
                broadcast();
            }}
        />
        <Slider
            value={hue}
            min={0}
            max={360}
            increment={1}
            unit={'°'}
            tip={getFirstName($creator.getLocale().output.Color.hue.names)}
            change={(value) => {
                hue = Math.round(value);
                broadcast();
            }}
        />
    </div>
    <div class="color" style:background-color={color.display()} />
</div>

<style>
    .component {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
    }

    .bands {
        flex-grow: 1;
        height: 3.5rem;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        display: flex;
        flex-direction: column;
        position: relative;
    }

    .slider {
        width: 50%;
    }

    .band {
        width: 100%;
        pointer-events: none;
        touch-action: none;
    }

    .selection {
        position: absolute;
        width: 4px;
        height: 4px;
        transform: translate(-2px, -2px);
        background: var(--wordplay-background);
        pointer-events: none;
        touch-action: none;
    }

    .color {
        width: auto;
        min-width: 3.5rem;
        height: 3.5rem;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }
</style>
