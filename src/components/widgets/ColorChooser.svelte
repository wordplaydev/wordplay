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

    function handleMouseMove(event: MouseEvent) {
        if (event.buttons !== 1 || hueWidth === undefined) return;
        hue = 360 * Math.max(0, Math.min(1, event.offsetX / hueWidth));
    }
</script>

<div class="component">
    <div class="chooser">
        <div
            class="hue"
            style:background="linear-gradient(to right, {getColors(
                lightness,
                chroma
            ).join(', ')})"
            on:mousedown={handleMouseMove}
            on:mousemove={handleMouseMove}
            bind:clientWidth={hueWidth}
            ><div
                class="selection"
                style:left="{(hue / 360) * hueWidth}px"
            /></div
        >
        <div class="sliders">
            <Slider
                value={chroma}
                min={0}
                max={100}
                increment={1}
                unit={''}
                change={(value) => (chroma = value)}
                isDefault={false}
            />
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
    </div>
    <div class="color" style:background-color={color.to('srgb').toString()} />
</div>

<style>
    .component {
        width: 100%;
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    .chooser {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .sliders {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
    }

    .hue {
        height: 1em;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .selection {
        position: relative;
        top: 0;
        height: 100%;
        width: 2px;
        background: var(--wordplay-background);
        pointer-events: none;
    }

    .color {
        width: 3rem;
        height: 3rem;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }
</style>
