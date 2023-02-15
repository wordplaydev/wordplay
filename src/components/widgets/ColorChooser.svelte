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
    let hueHeight: number | undefined = undefined;
    function handleMouseMove(event: MouseEvent) {
        if (
            event.buttons !== 1 ||
            hueWidth === undefined ||
            hueHeight === undefined
        )
            return;
        hue = 360 * Math.max(0, Math.min(1, event.offsetX / hueWidth));
        chroma =
            100 * (1 - Math.max(0, Math.min(1, event.offsetY / hueHeight)));
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
        {#each [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0] as val}
            <div
                class="band"
                style:background="linear-gradient(to right, {getColors(
                    lightness,
                    val
                ).join(', ')})"
            />
        {/each}

        <div
            class="selection"
            style:left="{(hue / 360) * hueWidth}px"
            style:top="{((100 - chroma) / 100) * hueHeight}px"
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
        height: 10%;
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
