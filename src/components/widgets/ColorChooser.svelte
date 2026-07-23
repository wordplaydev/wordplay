<script module lang="ts">
    import Slider from '@components/widgets/Slider.svelte';
    import { BCTKeys, Focals } from '@output/Color/BasicColors';

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
    import { getAnnouncer } from '@components/project/Contexts';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import { locales } from '@db/Database';
    import { getFirstText } from '@locale/LocaleText';
    import { describeColorLocalized } from '@output/Color/BasicColors';
    import {
        LCHtoCSS,
        parseColor,
        RGBtoLCH,
        serializeColor,
    } from '@output/Color/ColorJS';

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
    /** Unique id for the web-color text field. */
    const fieldId = `${instructionsId}-field`;

    let color = $derived(LCHtoCSS(lightness * 100, chroma, hue));

    /** Number of preset swatches (palette extras + the 11 BCT focals), used to
     *  lay them out as equal-width squares filling one flush row. */
    let swatchCount = $derived(palette.length + Primary.length);

    /** The web format last typed or serialized to (e.g. 'hex', 'rgb', 'hsl',
     *  'lch', 'oklch'). Drives how the text field re-renders the color when the
     *  other controls change. */
    let format = $state('hex');
    /** The text shown in the web-color field. Bound to the field; kept in sync
     *  with the LCH props by an effect when the field isn't focused. */
    let fieldText = $state('');
    /** Whether the text field has focus, so the sync effect doesn't overwrite
     *  what the user is typing. */
    let fieldFocused = $state(false);
    /** The parsed result of the current field text, or undefined when it isn't
     *  a recognized color. */
    let fieldColor = $derived(parseColor(fieldText));

    /** Keep the field in sync with the LCH props whenever the color changes via
     *  the band, sliders, palette, or eyedropper — but never while the user is
     *  typing. Re-serializes into the last-used format; `serializeColor` reports
     *  the format actually used so the chip reflects the keyword→hex fallback. */
    $effect(() => {
        if (fieldFocused) return;
        const result = serializeColor(lightness, chroma, hue, format);
        fieldText = result.text;
        if (result.format !== format) format = result.format;
    });

    /** Parse the typed color and, on success, drive the rest of the chooser from
     *  it. Invalid text is left alone (shown red, with ✕ on the format chip) and
     *  is reverted to the current color on blur by the sync effect. */
    function handleFieldInput(text: string) {
        const parsed = parseColor(text);
        if (parsed === undefined) return;
        lightness = parsed.lightness;
        chroma = parsed.chroma;
        hue = parsed.hue;
        format = parsed.format;
        broadcast();
    }

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
            $announce('color', $locales.getLanguages()[0], currentDescription);
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
    <!-- Preview, chroma×hue band, and preset swatches form one flush, bordered
         unit: preview + band on the top row, presets on the row below. There's
         no padding inside the unit — adjacent cells are separated only by 1px
         lines, drawn by the unit's border color showing through the grid/flex
         gaps, with a matching outer border. -->
    <div class="unit" style:--swatch-count={swatchCount}>
        <div class="top">
            <div
                class="preview"
                style:background-color={color}
                aria-label={currentDescription}
            ></div>
            <!-- The chroma×hue picker is a 2-D draggable region.
                 role="application" lets it accept pointer gestures and arrow-key
                 navigation while exposing a meaningful label to assistive tech.
                 When editable it joins the tab order so it's reachable and
                 adjustable without a pointer. -->
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
                        ><LocalizedText
                            path={(l) => l.ui.widget.color.instructions}
                        /></span
                    >
                {/if}
            </div>
        </div>
        <div class="primary">
            {#each [...palette, ...Primary] as primary}{@const swatchLabel =
                    describeColorLocalized(
                        $locales,
                        primary[0] / 100,
                        primary[1],
                        primary[2],
                    )}<Button
                    classes="swatch"
                    tip={() => swatchLabel}
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
    </div>

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

    <!-- Last row: eyedropper picker, the web-color text field, and a small chip
         showing the inferred format. Validation is surfaced on the chip (✕ +
         aria) rather than TextField's floating message, which would overflow
         this narrow chooser. -->
    <div class="input">
        {#if editable && canPick}
            <Button
                tip={(l) => l.ui.widget.color.pick.tip}
                icon="💧"
                action={() => pickColor()}
            ></Button>
        {/if}
        <TextField
            id={fieldId}
            bind:text={fieldText}
            description={(l) => l.ui.widget.color.input.description}
            placeholder={(l) => l.ui.widget.color.input.placeholder}
            classes={fieldColor === undefined ? ['error'] : undefined}
            changed={handleFieldInput}
            focus={() => (fieldFocused = true)}
            blur={() => (fieldFocused = false)}
            {editable}
            fill
        />
        <span
            class="format"
            class:error={fieldColor === undefined}
            title={fieldColor === undefined
                ? $locales.getPlainText((l) => l.ui.widget.color.input.invalid)
                : $locales.getPlainText((l) => l.ui.widget.color.input.format)}
            aria-label={fieldColor === undefined
                ? $locales.getPlainText((l) => l.ui.widget.color.input.invalid)
                : `${$locales.getPlainText(
                      (l) => l.ui.widget.color.input.format,
                  )}: ${format}`}
            >{fieldColor === undefined ? '✕' : format}</span
        >
    </div>
</div>

<style>
    /* Stack every row vertically and stretch each to full width so the chooser
       reads as a single rectangular block. */
    .component {
        width: 100%;
        max-width: 12em;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: var(--wordplay-spacing);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding-bottom: var(--wordplay-spacing);
    }

    /* The preview/band/presets unit. Its border color fills the background and
       outer border; the 1px flex/grid gaps inside let that color show through
       as the only separators between cells (no padding). */
    .unit {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-border-width);
        background: var(--wordplay-border-color);
        border-top-left-radius: var(--wordplay-border-radius);
        border-top-right-radius: var(--wordplay-border-radius);
        border-bottom: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    .top {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-border-width);
        height: 2rem;
    }

    .preview {
        width: 2rem;
        flex: 0 0 auto;
        border-top-left-radius: var(--wordplay-border-radius);
    }

    .bands {
        flex: 1;
        min-width: 2em;
        height: 100%;
        display: flex;
        flex-direction: column;
        position: relative;
        border-top-right-radius: var(--wordplay-border-radius);
        overflow: hidden;
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

    /* One flush row of equal-width square swatches, sized to fill the unit
       width. The 1px gaps reveal the unit's border color as separators. */
    .primary {
        display: grid;
        grid-template-columns: repeat(var(--swatch-count), 1fr);
        gap: var(--wordplay-border-width);
        background: var(--wordplay-border-color);
    }

    /* Override the Button chrome (min sizes, radius, shadow) so each swatch is a
       borderless square that fills its grid cell. */
    .primary :global(button.swatch) {
        display: block;
        width: 100%;
        aspect-ratio: 1;
        min-width: 0;
        min-height: 0;
        border-radius: 0;
        box-shadow: none;
    }

    .color {
        display: block;
        width: 100%;
        height: 100%;
    }

    /* Last row: eyedropper, text field, and format chip, sized to the small
       slider-label font so the field matches the labels above. */
    .input {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--wordplay-spacing);
        font-size: var(--wordplay-small-font-size);
        padding-inline-start: var(--wordplay-spacing);
        padding-inline-end: var(--wordplay-spacing);
    }

    /* Let the text field grow and the chip take its content width. */
    .input :global(.field-group) {
        flex: 1;
        min-width: 0;
    }

    /* Pin the chip to its content width (the field absorbs any shrink) and keep
       a small cushion so the format label never sits hard against the chooser's
       right edge. */
    .format {
        flex: 0 0 auto;
        color: var(--wordplay-inactive-color);
        white-space: nowrap;
        padding-inline-end: var(--wordplay-spacing-half);
    }

    .format.error {
        color: var(--wordplay-error);
    }
</style>
