<script module lang="ts">
    import type { FieldText, ModeText } from '@locale/UITexts';
    export type GlyphPageText = {
        header: string;
        prompt: string;
        instructions: string;
        subheader: {
            preview: string;
            other: string;
        };
        field: {
            name: FieldText;
            description: FieldText;
            mode: ModeText<string[]>;
            fill: ModeText<string[]>;
            stroke: ModeText<string[]>;
            /** What to call no color */
            none: string;
            /** What to call inherited color */
            inherit: string;
            /** Labels for the stroke width slider*/
            strokeWidth: {
                label: string;
                tip: string;
            };
            /** Labels for the border radius slider */
            radius: {
                label: string;
                tip: string;
            };
            /** Labels for the rotation slider */
            angle: {
                label: string;
                tip: string;
            };
            /** Closed path label */
            closed: string;
            /** Curved path label */
            curved: string;
        };
        error: {
            name: string;
            description: string;
        };
    };

    // svelte-ignore non_reactive_update
    enum DrawingMode {
        Select,
        Pixel,
        Rect,
        Ellipse,
        Path,
    }
</script>

<script lang="ts">
    import { locales } from '@db/Database';
    import Header from '@components/app/Header.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import TextBox from '@components/widgets/TextBox.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import { GlyphSize, glyphToSVG, type Shape } from '../../../glyphs/glyphs';
    import Page from '@components/app/Page.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import ColorChooser from '@components/widgets/ColorChooser.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import type LocaleText from '@locale/LocaleText';
    import Slider from '@components/widgets/Slider.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';

    /** The current name of the shape */
    let name = $state('');

    /** The current description of the shape */
    let description = $state('');

    /** The current shapes of the shape */
    let shapes: Shape[] = $state([]);

    /** The current drawing mode of the editor*/
    let mode: DrawingMode = $state(0);

    /** The current position for drawing, within the bounds of the glyph grid */
    let position = $state({ x: 0, y: 0 });

    /** The current fill color and whether it's on, off, or inherited */
    let currentFill: [number, number, number] = $state([100, 100, 0]);
    let fill: boolean | undefined = $state(true);

    /** The current stroke color and whether it's on, off, or inherited  */
    let currentStroke: [number, number, number] = $state([100, 100, 0]);
    let stroke: boolean | undefined = $state(true);

    /** The current stroke width */
    let strokeWidth = $state(1);

    /** The current border radius for rectangles */
    let radius = $state(0);

    /** The current rotation */
    let angle = $state(0);

    /** The closed path state */
    let closed = $state(true);

    /** The curved path state */
    let curved = $state(true);

    /** Make the rendered shape as a preview */
    let shape = $derived({
        name,
        description,
        shapes,
    });

    function validName(name: string) {
        return name.length > 0;
    }
    function validDescription(description: string) {
        return description.length > 0;
    }

    let error = $derived(
        !validName(name)
            ? $locales.get((l) => l.ui.page.glyph.error.name)
            : !validDescription(description)
              ? $locales.get((l) => l.ui.page.glyph.error.description)
              : undefined,
    );

    function handleKey(event: KeyboardEvent) {
        if (event.key === 'ArrowUp') {
            position.y = Math.max(0, position.y - 1);
        } else if (event.key === 'ArrowDown') {
            position.y = Math.min(GlyphSize - 1, position.y + 1);
        } else if (event.key === 'ArrowLeft') {
            position.x = Math.max(0, position.x - 1);
        } else if (event.key === 'ArrowRight') {
            position.x = Math.min(GlyphSize - 1, position.x + 1);
        }
    }
</script>

<svelte:head>
    <title>{$locales.get((l) => l.ui.page.glyph.header)} — {name}</title>
</svelte:head>

{#snippet colorChooser(
    state: boolean | undefined,
    color: [number, number, number],
    accessor: (locale: LocaleText) => any,
    setState: (state: boolean | undefined) => void,
    setColor: (color: [number, number, number]) => void,
)}
    <h2>{$locales.get(accessor).label}</h2>
    <Mode
        descriptions={$locales.get(accessor)}
        modes={[
            $locales.get((l) => l.ui.page.glyph.field.none),
            $locales.get((l) => l.ui.page.glyph.field.inherit),
            '🎨',
        ]}
        choice={state === true ? 2 : state === false ? 0 : 1}
        select={(choice: number) =>
            setState(choice === 2 ? true : choice === 0 ? false : undefined)}
        labeled={false}
    ></Mode>
    {#if state}
        <ColorChooser
            lightness={color[0]}
            chroma={color[1]}
            hue={color[2]}
            change={(l, c, h) => {
                setColor([l, c, h]);
            }}
        ></ColorChooser>
    {/if}
{/snippet}

<Page>
    <section>
        <div class="header">
            <Header>{$locales.get((l) => l.ui.page.glyph.header)}</Header>
            <p>{$locales.get((l) => l.ui.page.glyph.prompt)}</p>
        </div>
        <div class="editor">
            <div class="content">
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                <div
                    role="application"
                    aria-describedby="instructions"
                    class={['canvas', DrawingMode[mode].toLowerCase()]}
                    tabindex={0}
                    onkeydown={handleKey}
                >
                    <div class="grid">
                        <!-- Render gridlines below everything -->
                        {#each { length: GlyphSize }, x}
                            <div
                                class="line yline"
                                style="left: {100 * (x / GlyphSize)}%"
                            ></div>
                        {/each}
                        {#each { length: GlyphSize }, y}
                            <div
                                class="line xline"
                                style="top: {100 * (y / GlyphSize)}%"
                            ></div>
                        {/each}
                    </div>
                </div>
                <div class="labels">
                    <TextField
                        bind:text={name}
                        placeholder={$locales.get(
                            (l) => l.ui.page.glyph.field.name.placeholder,
                        )}
                        description={$locales.get(
                            (l) => l.ui.page.glyph.field.name.description,
                        )}
                        done={() => {}}
                        validator={validName}
                    ></TextField>
                    <TextBox
                        inline
                        bind:text={description}
                        placeholder={$locales.get(
                            (l) =>
                                l.ui.page.glyph.field.description.placeholder,
                        )}
                        description={$locales.get(
                            (l) =>
                                l.ui.page.glyph.field.description.description,
                        )}
                        done={() => {}}
                        validator={validDescription}
                    ></TextBox>
                    {#if error}
                        <Feedback inline>{error}</Feedback>
                    {/if}
                </div>
                <MarkupHtmlView
                    markup={$locales.get((l) => l.ui.page.glyph.instructions)}
                ></MarkupHtmlView>
            </div>
            <div class="palette">
                <h2>{$locales.get((l) => l.ui.page.glyph.subheader.preview)}</h2
                >
                <div class="preview">
                    {@html glyphToSVG(shape, 64)}
                </div>
                <h2>{$locales.get((l) => l.ui.page.glyph.field.mode).label}</h2>
                <Mode
                    descriptions={$locales.get(
                        (l) => l.ui.page.glyph.field.mode,
                    )}
                    modes={['👆', '■', '▬', '●', '◡']}
                    choice={mode}
                    select={(choice: number) => (mode = choice as DrawingMode)}
                    labeled={false}
                ></Mode>

                <!-- Shape only items -->
                {#if mode !== DrawingMode.Select}
                    <!-- All shapes have fills -->
                    {@render colorChooser(
                        fill,
                        currentFill,
                        (l) => l.ui.page.glyph.field.fill,
                        (choice) => (fill = choice),
                        (color) => (currentFill = color),
                    )}
                    <!-- All shapes except pixels have fills -->
                    {#if mode !== DrawingMode.Pixel}
                        {@render colorChooser(
                            stroke,
                            currentStroke,
                            (l) => l.ui.page.glyph.field.stroke,
                            (choice) => (stroke = choice),
                            (color) => (currentStroke = color),
                        )}
                        <Slider
                            label={$locales.get(
                                (l) => l.ui.page.glyph.field.strokeWidth.label,
                            )}
                            tip={$locales.get(
                                (l) => l.ui.page.glyph.field.strokeWidth.tip,
                            )}
                            min={1}
                            max={5}
                            increment={0.1}
                            precision={1}
                            unit={''}
                            bind:value={strokeWidth}
                        ></Slider>
                    {/if}
                    {#if mode !== DrawingMode.Pixel}
                        <h2
                            >{$locales.get(
                                (l) => l.ui.page.glyph.subheader.other,
                            )}</h2
                        >
                    {/if}
                    <!-- Only rectangles have a radius -->
                    {#if mode === DrawingMode.Rect}
                        <Slider
                            label={$locales.get(
                                (l) => l.ui.page.glyph.field.radius.label,
                            )}
                            tip={$locales.get(
                                (l) => l.ui.page.glyph.field.radius.tip,
                            )}
                            min={0}
                            max={5}
                            increment={0.1}
                            precision={1}
                            unit={''}
                            bind:value={radius}
                        ></Slider>
                    {/if}
                    <!-- All shapes but pixels have rotation -->
                    {#if mode !== DrawingMode.Pixel}
                        <Slider
                            label={$locales.get(
                                (l) => l.ui.page.glyph.field.angle.label,
                            )}
                            tip={$locales.get(
                                (l) => l.ui.page.glyph.field.angle.tip,
                            )}
                            min={0}
                            max={359}
                            increment={1}
                            precision={0}
                            unit={''}
                            bind:value={angle}
                        ></Slider>
                    {/if}
                    {#if mode === DrawingMode.Path}
                        <label>
                            <Checkbox
                                id="closed-path"
                                on={closed}
                                label={$locales.get(
                                    (l) => l.ui.page.glyph.field.closed,
                                )}
                            ></Checkbox>{$locales.get(
                                (l) => l.ui.page.glyph.field.closed,
                            )}
                        </label>
                        <label>
                            <Checkbox
                                id="curved-path"
                                on={curved}
                                label={$locales.get(
                                    (l) => l.ui.page.glyph.field.curved,
                                )}
                            ></Checkbox>{$locales.get(
                                (l) => l.ui.page.glyph.field.curved,
                            )}</label
                        >
                    {/if}
                {/if}
            </div>
        </div>
    </section>
</Page>

<style>
    section {
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        gap: var(--wordplay-spacing);
        width: 100%;
        height: 100%;
        background: var(--wordplay-background);
        padding: var(--wordplay-spacing);
    }

    .header {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        border-bottom: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
        align-items: baseline;
    }

    .editor {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: start;
    }

    .select {
        cursor: default;
    }

    .rect,
    .ellipse,
    .path,
    .pixel {
        cursor: crosshair;
    }

    .labels {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        row-gap: var(--wordplay-spacing);
        align-items: baseline;
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .canvas {
        aspect-ratio: 1/1;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        /* Set a current color to make strokes and fills using current color visible */
        color: var(--wordplay-background);
    }

    .palette {
        min-width: 15em;
        display: flex;
        flex-direction: column;
        gap: calc(2 * var(--wordplay-spacing));
    }

    h2 {
        margin: 0;
    }

    .preview {
        width: 64px;
        height: 64px;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
    }

    .grid {
        position: relative;
        width: 100%;
        height: 100%;

        .line {
            position: absolute;
            background: var(--wordplay-border-color);
        }

        .yline {
            width: var(--wordplay-border-width);
            top: 0;
            bottom: 0;
        }

        .xline {
            position: absolute;
            height: var(--wordplay-border-width);
            left: 0;
            right: 0;
            background: var(--wordplay-border-color);
        }
    }

    label {
        display: flex;
        flex-direction: row;
        align-items: baseline;
    }
</style>
