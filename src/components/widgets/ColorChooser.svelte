<script module lang="ts">
    import Slider from './Slider.svelte';

    // Create a list of hues in the LCH color space from 0 to 360
    function getColors(lightness: number, chroma: number) {
        const values = [];
        for (let hue = 0; hue < 360; hue += 10) values.push(hue);
        return values.map((hue) => LCHtoCSS(lightness, chroma, hue));
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
        (val) => percentToChroma(val),
    );

    const Primary: [number, number, number][] = [
        [0, 0, 0],
        [33, 0, 0],
        [66, 0, 0],
        [100, 0, 0],
        [50, 109, 42], // red
        [50, 127, 174], // green
        [50, 117, 282], // blue
        // [91, 50, 196], // cyan
        // [60, 115, 328], // magenta
        // [97, 96, 102], // yellow
    ];
</script>

<script lang="ts">
    import { LCHtoCSS } from '@output/ColorJS';
    import { getFirstText } from '../../locale/LocaleText';
    import Button from './Button.svelte';

    interface Props {
        /** a degree (any number remainder 360) */
        hue: number;
        /** any positive value to infinity */
        chroma: number;
        /** 0-1 */
        lightness: number;
        /** Called every time the color changes */
        change: (l: number, c: number, h: number) => void;
        editable?: boolean;
        id?: string | undefined;
        /** Additional colors to add to the palette */
        palette?: [number, number, number][];
    }

    let {
        hue = $bindable(),
        chroma = $bindable(),
        lightness = $bindable(),
        change,
        editable = true,
        id = undefined,
        palette = [],
    }: Props = $props();

    let color = $derived(LCHtoCSS(lightness * 100, chroma, hue));

    let hueWidth: number | undefined = $state(undefined);
    let hueHeight: number | undefined = $state(undefined);
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

<div class="component" {id}>
    <div class="preview" style:background-color={color}></div>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="bands"
        onpointerdown={editable ? handleMouseMove : null}
        onpointermove={editable ? handleMouseMove : null}
        bind:clientWidth={hueWidth}
        bind:clientHeight={hueHeight}
    >
        {#each Bands as val}
            <div
                class="band"
                style:height="{100 / Bands.length}%"
                style:background="linear-gradient(to right, {getColors(
                    lightness * 100,
                    val,
                ).join(', ')})"
            ></div>
        {/each}

        <div
            class="selection"
            style:left="{hueToPercent(hue) * hueWidth}px"
            style:top="{(1 - chromaToPercent(chroma)) * hueHeight}px"
        ></div>
    </div>
    <div class="primary">
        {#each [...palette, ...Primary] as primary}<Button
                tip={() => primary.join(',')}
                padding={false}
                action={() => {
                    lightness = primary[0] / 100;
                    chroma = primary[1];
                    hue = primary[2];
                    broadcast();
                }}
                ><div
                    class="color"
                    style:background={LCHtoCSS(
                        primary[0],
                        primary[1],
                        primary[2],
                    )}
                ></div></Button
            >{/each}
    </div>

    <div class="slider">
        <Slider
            label={(l) => getFirstText(l.output.Color.lightness.names)}
            value={lightness}
            min={0}
            max={1}
            increment={0.01}
            tip={(l) => l.output.Color.lightness.names}
            unit={'%'}
            precision={0}
            change={(value) => {
                lightness = value.toNumber();
                broadcast();
            }}
            {editable}
        />
        <Slider
            label={(l) => getFirstText(l.output.Color.chroma.names)}
            value={chroma}
            min={0}
            max={150}
            increment={1}
            unit=""
            tip={(l) => l.output.Color.chroma.names}
            change={(value) => {
                chroma = value.round().toNumber();
                broadcast();
            }}
            {editable}
        />
        <Slider
            label={(l) => getFirstText(l.output.Color.hue.names)}
            value={hue}
            min={0}
            max={360}
            increment={1}
            unit={'°'}
            tip={(l) => l.output.Color.hue.names}
            change={(value) => {
                hue = value.round().toNumber();
                broadcast();
            }}
            {editable}
        />
    </div>
</div>

<style>
    .component {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
    }

    .bands {
        min-width: 4em;
        height: 2rem;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        display: flex;
        flex-direction: column;
        position: relative;
        flex-grow: 1;
    }

    .slider {
        flex-grow: 1;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        row-gap: var(--wordplay-spacing);
    }

    .band {
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

    .primary {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 0;
        row-gap: 0;
    }

    .color {
        width: 1em;
        height: 1em;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .preview {
        width: auto;
        min-width: 2rem;
        height: 2rem;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }
</style>
