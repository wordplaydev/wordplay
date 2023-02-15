<script context="module" lang="ts">
    import ColorJS from 'colorjs.io';
    import Slider from './Slider.svelte';
    // Create a list of hues in the LCH color space from 0 to 360
    function getColors(lightness: number, chroma: number) {
        const values = [];
        for (let i = 0; i < 360; i += 5) values.push(i);
        return values.map((i) =>
            new ColorJS(ColorJS.spaces.lch, [lightness, chroma, i], 1)
                .to('srgb')
                .toString()
        );
    }

    const MaxChroma = 100;

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
    /** a degree (any number remainder 360) */
    export let hue: number = 0;
    /** any positive value to infinity */
    export let chroma: number = 100;
    /** 0-100 */
    export let lightness: number = 50;

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
        hue = percentToHue(event.offsetX / hueWidth);
        chroma = percentToChroma(1 - event.offsetY / hueHeight);
    }
</script>

<div class="component">
    <div
        class="hue"
        on:mousedown={handleMouseMove}
        on:mousemove={handleMouseMove}
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
            unit={'%'}
            change={(value) => (lightness = value)}
            isDefault={false}
        />
    </div>
    <div class="color" style:background-color={color.to('srgb').toString()} />
</div>

<style>
    .component {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
    }

    .hue {
        flex-grow: 1;
        height: 2rem;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        display: flex;
        flex-direction: column;
        position: relative;
    }

    .slider {
        flex-grow: 0;
    }

    .band {
        width: 100%;
        pointer-events: none;
    }

    .selection {
        position: absolute;
        width: 4px;
        height: 4px;
        transform: translate(-2px, -2px);
        background: var(--wordplay-background);
        pointer-events: none;
    }

    .color {
        width: auto;
        min-width: 2rem;
        height: 2rem;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }
</style>
