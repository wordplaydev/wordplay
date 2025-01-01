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
    import {
        GlyphSize,
        glyphToSVG,
        pixelsAreEqual,
        type GlyphEllipse,
        type GlyphPath,
        type GlyphPixel,
        type GlyphRectangle,
        type GlyphShape,
    } from '../../../glyphs/glyphs';
    import Page from '@components/app/Page.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import ColorChooser from '@components/widgets/ColorChooser.svelte';
    import MarkupHtmlView from '@components/concepts/MarkupHTMLView.svelte';
    import type LocaleText from '@locale/LocaleText';
    import Slider from '@components/widgets/Slider.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';

    /** The current name of the shape */
    let name = $state('');

    /** The current description of the shape */
    let description = $state('');

    /** The current shapes of the shape */
    let shapes: GlyphShape[] = $state([]);

    /** The current drawing mode of the editor*/
    let mode: DrawingMode = $state(0);

    /** The current position for drawing, within the bounds of the glyph grid */
    let position = $state({ x: 0, y: 0 });

    /** The current fill color and whether it's on, off, or inherited */
    let currentFill: [number, number, number] = $state([1, 100, 0]);
    let fill: boolean | undefined = $state(true);

    /** The current stroke color and whether it's on, off, or inherited  */
    let currentStroke: [number, number, number] = $state([0, 100, 0]);
    let stroke: boolean | undefined = $state(true);

    /** The current stroke width */
    let strokeWidth = $state(1);

    /** The current border radius for rectangles */
    let corner = $state(0);

    /** The current rotation */
    let angle = $state(0);

    /** The closed path state */
    let closed = $state(true);

    /** The curved path state */
    let curved = $state(true);

    /** The HTML element of the canvas */
    let canvasView: HTMLDivElement | null = null;

    /** The pending rectangle */
    let pendingRect: GlyphRectangle | undefined = $state(undefined);

    /** The pending ellipse */
    let pendingEllipse: GlyphEllipse | undefined = $state(undefined);

    /** The pendig path */
    let pendingPath: GlyphPath;

    /** Make the rendered shape as a preview */
    let glyph = $derived({
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

    /** Set the pixel at the current position and fill. */
    function setPixel() {
        const candidate: GlyphPixel = {
            type: 'pixel',
            point: [position.x, position.y],
            fill:
                fill === undefined
                    ? null
                    : {
                          l: currentFill[0],
                          c: currentFill[1],
                          h: currentFill[2],
                      },
        };
        const match = shapes
            // Remove pixels at the same position
            .find((s) => s.type === 'pixel' && pixelsAreEqual(s, candidate));
        // Already an identical pixel? No need to rerender.
        if (match) return;

        shapes = [
            ...shapes
                // Remove pixels at the same position
                .filter(
                    (s) =>
                        s.type === 'pixel' &&
                        (s.point[0] !== position.x ||
                            s.point[1] !== position.y),
                ),
            candidate,
        ];
    }

    function getCurrentFill() {
        return fill === undefined
            ? null
            : {
                  l: currentFill[0],
                  c: currentFill[1],
                  h: currentFill[2],
              };
    }

    function getCurrentStroke() {
        return stroke === undefined
            ? undefined
            : {
                  color: {
                      l: currentStroke[0],
                      c: currentStroke[1],
                      h: currentStroke[2],
                  },
                  width: strokeWidth,
              };
    }

    function handleKey(event: KeyboardEvent) {
        // Handle cursor movement
        if (event.key === 'ArrowUp') {
            position.y = Math.max(0, position.y - 1);
        } else if (event.key === 'ArrowDown') {
            position.y = Math.min(GlyphSize - 1, position.y + 1);
        } else if (event.key === 'ArrowLeft') {
            position.x = Math.max(0, position.x - 1);
        } else if (event.key === 'ArrowRight') {
            position.x = Math.min(GlyphSize - 1, position.x + 1);
        }

        // If in pixel mode, drop a pixel.
        if (
            mode === DrawingMode.Pixel &&
            (event.key === 'Enter' || event.key === ' ')
        ) {
            setPixel();
            event.stopPropagation();
            return;
        }
    }

    function handlePointerDown(event: PointerEvent) {
        if (!(event.currentTarget instanceof HTMLElement)) return;

        // Get the current canvas position.
        const x = Math.floor(
            (event.offsetX / event.currentTarget.clientWidth) * GlyphSize,
        );
        const y = Math.floor(
            (event.offsetY / event.currentTarget.clientHeight) * GlyphSize,
        );

        // Move the position to the pointer
        position = {
            x,
            y,
        };
        event.stopPropagation();

        // Button not down? Don't do anything else.
        if (event.buttons !== 1) return;

        // In pixel mode? Drop a pixel.
        if (mode === DrawingMode.Pixel) {
            setPixel();
            if (canvasView) setKeyboardFocus(canvasView, 'Focus the canvas.');
            return;
        }
        // In rectangle mode? Start or update a rectangle.
        if (mode === DrawingMode.Rect) {
            // If there's no pending rect, start one at the current position.
            if (pendingRect === undefined) {
                pendingRect = {
                    ...{
                        type: 'rect',
                        center: [position.x, position.y],
                        width: 1,
                        height: 1,
                    },
                    ...(fill !== false && { fill: getCurrentFill() }),
                    ...(stroke !== false && { stroke: getCurrentStroke() }),
                    ...(corner !== 1 && { corner }),
                    ...(angle !== 0 && { angle }),
                };
                shapes = [...shapes, pendingRect];
            } else {
                // Update the pending rect's dimensions to the current pointer position.
                pendingRect.width = Math.max(
                    1,
                    Math.abs(position.x - pendingRect.center[0]) * 2,
                );
                pendingRect.height = Math.max(
                    1,
                    Math.abs(position.y - pendingRect.center[1]) * 2,
                );
            }
            return;
        } else if (mode === DrawingMode.Ellipse) {
            // If there's no pending rect, start one at the current position.
            if (pendingEllipse === undefined) {
                pendingEllipse = {
                    ...{
                        type: 'ellipse',
                        center: [position.x, position.y],
                        width: 1,
                        height: 1,
                    },
                    ...(fill !== false && { fill: getCurrentFill() }),
                    ...(stroke !== false && { stroke: getCurrentStroke() }),
                    ...(angle !== 0 && { angle }),
                };
                shapes = [...shapes, pendingEllipse];
            } else {
                // Update the pending rect's dimensions to the current pointer position.
                pendingEllipse.width = Math.max(
                    1,
                    Math.abs(position.x - pendingEllipse.center[0]) * 2,
                );
                pendingEllipse.height = Math.max(
                    1,
                    Math.abs(position.y - pendingEllipse.center[1]) * 2,
                );
            }
            return;
        }
    }

    function handlePointerUp(event: PointerEvent) {
        // Done? Reset the pending rect to nothing.
        if (pendingRect) {
            pendingRect = undefined;
            event.stopPropagation();
            return;
        } else if (pendingEllipse) {
            pendingEllipse = undefined;
            event.stopPropagation();
            return;
        }
    }
</script>

<svelte:head>
    <title>{$locales.get((l) => l.ui.page.glyph.header)} — {name}</title>
</svelte:head>

<!-- Fill and stroke choosers -->
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

<!-- Grid lines -->
{#snippet grid()}
    <div class="grid">
        <!-- Render gridlines below everything -->
        {#each { length: GlyphSize }, x}
            <div class="line yline" style="left: {100 * (x / GlyphSize)}%"
            ></div>
        {/each}
        {#each { length: GlyphSize }, y}
            <div class="line xline" style="top: {100 * (y / GlyphSize)}%"></div>
        {/each}
    </div>

    <style>
        .grid {
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
    </style>
{/snippet}

<!-- The palette -->
{#snippet palette()}
    <div class="palette">
        <h2>{$locales.get((l) => l.ui.page.glyph.subheader.preview)}</h2>
        <div class="preview">
            {@html glyphToSVG(glyph, '32px')}
        </div>
        <h2>{$locales.get((l) => l.ui.page.glyph.field.mode).label}</h2>
        <Mode
            descriptions={$locales.get((l) => l.ui.page.glyph.field.mode)}
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
                    min={0}
                    max={3}
                    increment={0.1}
                    precision={1}
                    unit={''}
                    bind:value={strokeWidth}
                ></Slider>
            {/if}
            {#if mode !== DrawingMode.Pixel}
                <h2>{$locales.get((l) => l.ui.page.glyph.subheader.other)}</h2>
            {/if}
            <!-- Only rectangles have a radius -->
            {#if mode === DrawingMode.Rect}
                <Slider
                    label={$locales.get(
                        (l) => l.ui.page.glyph.field.radius.label,
                    )}
                    tip={$locales.get((l) => l.ui.page.glyph.field.radius.tip)}
                    min={0}
                    max={5}
                    increment={0.1}
                    precision={1}
                    unit={''}
                    bind:value={corner}
                ></Slider>
            {/if}
            <!-- All shapes but pixels have rotation -->
            {#if mode !== DrawingMode.Pixel}
                <Slider
                    label={$locales.get(
                        (l) => l.ui.page.glyph.field.angle.label,
                    )}
                    tip={$locales.get((l) => l.ui.page.glyph.field.angle.tip)}
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

    <style>
        .palette {
            min-width: 15em;
            display: flex;
            flex-direction: column;
            gap: calc(2 * var(--wordplay-spacing));
        }

        .preview {
            width: 32px;
            height: 32px;
            border: var(--wordplay-border-color) solid
                var(--wordplay-border-width);
        }

        label {
            display: flex;
            flex-direction: row;
            align-items: baseline;
        }
    </style>
{/snippet}

{#snippet meta()}
    <div class="meta">
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
                (l) => l.ui.page.glyph.field.description.placeholder,
            )}
            description={$locales.get(
                (l) => l.ui.page.glyph.field.description.description,
            )}
            done={() => {}}
            validator={validDescription}
        ></TextBox>
        {#if error}
            <Feedback inline>{error}</Feedback>
        {/if}
    </div>
    <MarkupHtmlView markup={$locales.get((l) => l.ui.page.glyph.instructions)}
    ></MarkupHtmlView>

    <style>
        .meta {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: var(--wordplay-spacing);
            row-gap: var(--wordplay-spacing);
            align-items: baseline;
        }
    </style>
{/snippet}

{#snippet canvas()}
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
        role="application"
        aria-describedby="instructions"
        class={['canvas', DrawingMode[mode].toLowerCase()]}
        tabindex={0}
        bind:this={canvasView}
        onkeydown={handleKey}
        onpointerdown={handlePointerDown}
        onpointermove={handlePointerDown}
        onpointerup={handlePointerUp}
    >
        {@render grid()}
        {@html glyphToSVG(glyph, '100%')}
        {#if mode !== DrawingMode.Select}
            <div
                class="position"
                style:left="{(100 * position.x) / GlyphSize}%"
                style:top="{(100 * position.y) / GlyphSize}%"
                style:width={'calc(100% / ' + GlyphSize + ')'}
                style:height={'calc(100% / ' + GlyphSize + ')'}
            ></div>
        {/if}
    </div>
    <style>
        .canvas {
            position: relative;
            aspect-ratio: 1/1;
            border: var(--wordplay-border-color) solid
                var(--wordplay-border-width);
            /* Set a current color to make strokes and fills using current color visible */
            color: var(--wordplay-background);
        }

        .canvas:focus {
            outline: var(--wordplay-focus-color) solid
                var(--wordplay-focus-width);
        }

        .position {
            position: absolute;
            width: 1em;
            height: 1em;
            border: solid var(--wordplay-highlight-color)
                var(--wordplay-focus-width);
            border-radius: 50%;
            pointer-events: none;
        }

        .canvas svg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
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
    </style>
{/snippet}

<Page>
    <section>
        <div class="header">
            <Header>{$locales.get((l) => l.ui.page.glyph.header)}</Header>
            <p>{$locales.get((l) => l.ui.page.glyph.prompt)}</p>
        </div>
        <div class="editor">
            <div class="content">
                {@render canvas()}
                {@render meta()}
            </div>
            {@render palette()}
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
        gap: calc(2 * var(--wordplay-spacing));
        align-items: start;
    }

    .content {
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    h2 {
        margin: 0;
    }
</style>
