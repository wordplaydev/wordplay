<script module lang="ts">
    import Slider from '@components/widgets/Slider.svelte';
    import { BCTKeys, Focals } from '@output/BasicColors';

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

    /** Palette swatches sourced from the 11 Basic Color Term focal points
     *  in `BasicColors`. Stored as `[lightness%, chroma, hue]` to match
     *  the `palette` prop's shape; the localized BCT name comes from
     *  `describeColorLocalized` on the same LCH triple. */
    const Primary: [number, number, number][] = BCTKeys.map((key) => [
        Focals[key].l * 100,
        Focals[key].c,
        Focals[key].h,
    ]);

    /** Per-instance counter so each chooser's screen-reader instructions
     *  element gets a unique id for aria-describedby, even when several
     *  choosers share a page. */
    let idCounter = 0;
</script>

<script lang="ts">
    import { LCHtoCSS, RGBtoLCH } from '@output/ColorJS';
    import { describeColorLocalized } from '@output/BasicColors';
    import { getFirstText } from '@locale/LocaleText';
    import { locales } from '@db/Database';
    import { getAnnouncer } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';

    interface Props {
        /** a degree (any number remainder 360) */
        hue: number;
        /** any positive value to infinity */
        chroma: number;
        /** 0-1 */
        lightness: number;
        /** Called every time the color changes */
        change: (l: number, c: number, h: number) => void;
        start?: () => void;
        release?: () => void;
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
        start = undefined,
        release = undefined,
        editable = true,
        id = undefined,
        palette = [],
    }: Props = $props();

    /** Unique id for the band's visually-hidden instructions, referenced by
     *  the band's aria-describedby. */
    const instructionsId = `color-instructions-${idCounter++}`;

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

    const announce = getAnnouncer();

    function broadcast() {
        change(lightness, chroma, hue);
        // Push the new color description into the central announcer so
        // screen-reader users hear it. Falls back silently when no
        // announcer is in context (e.g., outside ProjectView).
        if (announce && $announce) {
            $announce(
                'color',
                $locales.getLanguages()[0],
                currentDescription,
            );
        }
    }

    /** Localized description of the current color, recomputed reactively
     *  on each lightness/chroma/hue change. Used for the focus-time
     *  `aria-label` on the preview/picker, and pushed into the central
     *  Announcer on each broadcast. The LCH values follow the color name so
     *  the text changes on every arrow-key step — otherwise small steps that
     *  stay within the same named color produce identical text and screen
     *  readers stay silent. */
    let currentDescription = $derived(
        $locales
            .concretize((l) => l.ui.widget.color.value, {
                color: describeColorLocalized($locales, lightness, chroma, hue),
                l: Math.round(lightness * 100),
                c: Math.round(chroma),
                h: Math.round(hue),
            })
            .toText(),
    );

    /** Whether the browser supports the EyeDropper API, gating the picker button. */
    const canPick = typeof window !== 'undefined' && 'EyeDropper' in window;

    /** Open the OS color picker (eyedropper) and set the chooser to the
     *  selected screen color, converting from sRGB to the LCH space the
     *  chooser uses. */
    async function pickColor() {
        if (window.EyeDropper === undefined) return;

        const dropper = new window.EyeDropper();
        const result = await dropper.open();
        const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
            result.sRGBHex,
        );
        const rgb = match
            ? {
                  r: parseInt(match[1], 16), // Convert the hex pair to a decimal number
                  g: parseInt(match[2], 16),
                  b: parseInt(match[3], 16),
              }
            : null;
        if (rgb === null) return;

        const lch = RGBtoLCH(rgb.r / 255, rgb.g / 255, rgb.b / 255);

        lightness = Math.round(lch.coords[0] ?? 0) / 100;
        chroma = Math.round(lch.coords[1] ?? 0);
        hue = Math.round(lch.coords[2] ?? 0);
        broadcast();
    }

    /** Keyboard step sizes for the chroma×hue band. Left/right move hue by
     *  degrees; up/down move chroma by a fraction of the vertical band so
     *  each press travels the same visual distance. Shift gives finer steps.
     *  Mirrors the approved design in issue #937. */
    const HueStep = 5;
    const FineHueStep = 1;
    const ChromaStep = 0.05;
    const FineChromaStep = 0.01;

    /** Move the band selection with the arrow keys so the picker is usable
     *  without a pointer. Each change broadcasts, which also announces the
     *  new color through the central Announcer. */
    function handleKey(event: KeyboardEvent) {
        if (!editable) return;
        const fine = event.shiftKey;
        let handled = true;
        switch (event.key) {
            case 'ArrowLeft':
                hue = Math.max(0, hue - (fine ? FineHueStep : HueStep));
                break;
            case 'ArrowRight':
                hue = Math.min(360, hue + (fine ? FineHueStep : HueStep));
                break;
            case 'ArrowUp':
            case 'ArrowDown': {
                const delta =
                    (event.key === 'ArrowUp' ? 1 : -1) *
                    (fine ? FineChromaStep : ChromaStep);
                const percent = Math.max(
                    0,
                    Math.min(1, chromaToPercent(chroma) + delta),
                );
                chroma = Math.round(percentToChroma(percent));
                break;
            }
            default:
                handled = false;
        }
        if (handled) {
            event.preventDefault();
            broadcast();
        }
    }
</script>

<div class="component" {id}>
    <div
        class="preview"
        style:background-color={color}
        aria-label={currentDescription}
    ></div>
    <!-- The chroma×hue picker is a 2-D draggable region. role="application"
         lets it accept pointer gestures and arrow-key navigation while
         exposing a meaningful label to assistive tech. When editable it joins
         the tab order so it's reachable and adjustable without a pointer. -->
    <!-- svelte-ignore a11y_no_static_element_interactions, a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
    <div
        class="bands"
        role="application"
        aria-label={currentDescription}
        aria-roledescription={$locales.getPlainText(
            (l) => l.ui.widget.color.field,
        )}
        aria-describedby={editable ? instructionsId : null}
        tabindex={editable ? 0 : -1}
        onpointerdown={editable
            ? (e) => {
                  start?.();
                  handleMouseMove(e);
              }
            : null}
        onpointermove={editable ? handleMouseMove : null}
        onpointerup={editable ? () => release?.() : null}
        onkeydown={editable ? handleKey : null}
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

        <!-- Visually-hidden usage instructions. Doubles as the
             aria-describedby target and as real subtree content so the
             application isn't announced as "empty". -->
        {#if editable}
            <span id={instructionsId} class="instructions"
                >{$locales.getPlainText(
                    (l) => l.ui.widget.color.instructions,
                )}</span
            >
        {/if}
    </div>
    {#if editable && canPick}
        <Button
            tip={(l) => l.ui.widget.color.pick.tip}
            padding={false}
            icon="💧"
            action={() => pickColor()}
        ></Button>
    {/if}
    <div class="primary">
        {#each [...palette, ...Primary] as primary}{@const swatchLabel =
                describeColorLocalized(
                    $locales,
                    primary[0] / 100,
                    primary[1],
                    primary[2],
                )}<Button
                tip={() => swatchLabel}
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
                    aria-label={swatchLabel}
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
            tip={(l) => l.output.Color.lightness.names[0]}
            unit={'%'}
            precision={0}
            {...start ? { start } : {}}
            {...release ? { release: () => release() } : {}}
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
            tip={(l) => l.output.Color.chroma.names[0]}
            {...start ? { start } : {}}
            {...release ? { release: () => release() } : {}}
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
            tip={(l) => l.output.Color.hue.names[0]}
            {...start ? { start } : {}}
            {...release ? { release: () => release() } : {}}
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

    /* Visually hidden, but present in the accessibility tree (mirrors the
       recipe in Announcer.svelte). */
    .instructions {
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        height: 1px;
        width: 1px;
        overflow: hidden;
        position: absolute;
        white-space: nowrap;
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
