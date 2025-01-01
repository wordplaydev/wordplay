<script module lang="ts">
    import type { FieldText, ModeText } from '@locale/UITexts';
    export type GlyphPageText = {
        header: string;
        prompt: string;
        instructions: string;
        subheader: {
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
        feedback: {
            /** When the name isn't a valid Wordplay name */
            name: string;
            /** When the description is empty */
            description: string;
            /** When completing a path, instructions on how to end it. */
            end: string;
            /** When selecting, instructions on how to select multiple. */
            select: string;
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

    type ColorSetting = 'none' | 'inherit' | 'set';
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

    /** The current list of shapes of the glyph */
    let shapes: GlyphShape[] = $state([]);

    /** The current drawing mode of the editor*/
    let mode: DrawingMode = $state(0);

    /** The current selection of shapes, just pointers to the object, since we will mutate them. */
    let selection: GlyphShape[] = $state([]);

    /** The current position for drawing, within the bounds of the glyph grid */
    let position = $state({ x: 0, y: 0 });

    /** The current fill color and whether it's on, off, or inherited */
    let currentFill: [number, number, number] = $state([0.5, 0, 0]);
    let fill: ColorSetting = $state('set');

    /** The current stroke color and whether it's on, off, or inherited  */
    let currentStroke: [number, number, number] = $state([0.0, 0, 0]);
    let stroke: ColorSetting = $state('set');

    /** The current stroke width */
    let strokeWidth = $state(1);

    /** The current border radius for rectangles */
    let corner = $state(0);

    /** The current rotation */
    let angle = $state(0);

    /** The closed path state */
    let closed = $state(true);

    /** The curved path state */
    let curved = $state(false);

    /** The HTML element of the canvas */
    let canvasView: HTMLDivElement | null = null;

    /** The pending rectangle */
    let pendingRect: GlyphRectangle | undefined = $state(undefined);

    /** The pending ellipse */
    let pendingEllipse: GlyphEllipse | undefined = $state(undefined);

    /** The pendig path */
    let pendingPath: GlyphPath | undefined = $state(undefined);

    /** Make the rendered shape as a preview */
    let glyph = $derived({
        name,
        description,
        shapes,
    });

    // If the mode changes, end the pending path.
    $effect(() => {
        if (mode !== DrawingMode.Path) pendingPath = undefined;
    });

    function validName(name: string) {
        return name.length > 0;
    }
    function validDescription(description: string) {
        return description.length > 0;
    }

    let error = $derived(
        !validName(name)
            ? $locales.get((l) => l.ui.page.glyph.feedback.name)
            : !validDescription(description)
              ? $locales.get((l) => l.ui.page.glyph.feedback.description)
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
                        s.type !== 'pixel' ||
                        s.point[0] !== position.x ||
                        s.point[1] !== position.y,
                ),
            candidate,
        ];
    }

    function getCurrentFill() {
        return fill === 'inherit'
            ? null
            : fill === 'none'
              ? undefined
              : {
                    l: currentFill[0],
                    c: currentFill[1],
                    h: currentFill[2],
                };
    }

    function getCurrentStroke() {
        return stroke === 'none'
            ? undefined
            : {
                  color:
                      stroke === 'inherit'
                          ? null
                          : {
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
            event.stopPropagation();
        } else if (event.key === 'ArrowDown') {
            position.y = Math.min(GlyphSize - 1, position.y + 1);
            event.stopPropagation();
        } else if (event.key === 'ArrowLeft') {
            position.x = Math.max(0, position.x - 1);
            event.stopPropagation();
        } else if (event.key === 'ArrowRight') {
            event.stopPropagation();
            position.x = Math.min(GlyphSize - 1, position.x + 1);
        }

        // If in pixel mode, drop a pixel.
        if (
            mode === DrawingMode.Pixel &&
            (event.key === 'Enter' || event.key === ' ')
        ) {
            setPixel();
            return;
        }
        // If in path mode and key is escape, close the path
        if (mode === DrawingMode.Path && event.key === 'Escape') {
            if (pendingPath) {
                pendingPath = undefined;
                event.stopPropagation();
                return;
            }
        }
    }

    function handlePointerDown(event: PointerEvent, move: boolean) {
        if (!(event.currentTarget instanceof HTMLElement)) return;

        if (!move && canvasView) {
            setKeyboardFocus(canvasView, 'Focus the canvas.');
            event.preventDefault();
        }

        if (!move) {
            const candidate = document.elementFromPoint(
                event.clientX,
                event.clientY,
            );
            let found = false;
            if (candidate instanceof SVGElement) {
                const svg = candidate.parentElement;
                if (svg !== null && svg.parentElement === canvasView) {
                    const index = Array.from(svg.childNodes).indexOf(candidate);
                    console.log(index);
                    if (index >= 0) {
                        if (event.shiftKey)
                            selection = [...selection, shapes[index]];
                        else selection = [shapes[index]];
                        found = true;
                    }
                }
            }
            if (!found) selection = [];
        }

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
                    ...(fill !== undefined && { fill: getCurrentFill() }),
                    ...(stroke !== undefined && { stroke: getCurrentStroke() }),
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
                    ...(fill !== undefined && { fill: getCurrentFill() }),
                    ...(stroke !== undefined && { stroke: getCurrentStroke() }),
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
        } else if (mode === DrawingMode.Path && !move) {
            if (pendingPath === undefined) {
                pendingPath = {
                    type: 'path',
                    points: [[position.x, position.y]],
                    closed: closed,
                    curved: curved,
                    ...(fill !== undefined && { fill: getCurrentFill() }),
                    ...(stroke !== undefined && { stroke: getCurrentStroke() }),
                    ...(angle !== 0 && { angle }),
                };
                shapes = [...shapes, pendingPath];
            } else {
                const last = pendingPath.points[pendingPath.points.length - 1];
                // Different point than the last? Record it.
                if (last[0] !== position.x && last[1] !== position.y)
                    pendingPath.points.push([position.x, position.y]);
            }
            return;
        }
    }

    function handlePointerUp(event: PointerEvent) {
        // Done? Reset the pending shapes to nothing.
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
    state: ColorSetting,
    color: [number, number, number],
    accessor: (locale: LocaleText) => any,
    setState: (state: ColorSetting) => void,
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
        choice={state === 'none' ? 0 : state === 'inherit' ? 1 : 2}
        select={(choice: number) =>
            setState(choice === 0 ? 'none' : choice === 1 ? 'inherit' : 'set')}
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
                <Feedback>{error}</Feedback>
            {/if}
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
        {#if mode !== DrawingMode.Select || selection.length > 0}
            <!-- All shapes have fills -->
            {@render colorChooser(
                fill,
                currentFill,
                (l) => l.ui.page.glyph.field.fill,
                (choice) => {
                    fill = choice;
                    for (const shape of selection)
                        shape.fill = getCurrentFill();
                },
                (color) => {
                    currentFill = color;
                    for (const shape of selection)
                        shape.fill = getCurrentFill();
                },
            )}
            <!-- All shapes except pixels have strokes -->
            {#if mode !== DrawingMode.Pixel || selection.some((s) => s.type !== 'pixel')}
                {@render colorChooser(
                    stroke,
                    currentStroke,
                    (l) => l.ui.page.glyph.field.stroke,
                    (choice) => {
                        stroke = choice;
                        for (const shape of selection)
                            if (shape.type !== 'pixel')
                                shape.stroke = getCurrentStroke();
                    },
                    (color) => {
                        currentStroke = color;
                        for (const shape of selection)
                            if (shape.type !== 'pixel')
                                if (shape.stroke)
                                    // Already a stroke? Just set the color.
                                    shape.stroke.color = {
                                        l: currentStroke[0],
                                        c: currentStroke[1],
                                        h: currentStroke[2],
                                    };
                                // Otherwise, set the whole stroke.
                                else shape.stroke = getCurrentStroke();
                    },
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
                    change={(val) => {
                        for (const shape of selection)
                            if ('stroke' in shape && shape.stroke !== undefined)
                                shape.stroke.width = val.toNumber();
                    }}
                ></Slider>
            {/if}
            {#if mode !== DrawingMode.Pixel}
                <h2>{$locales.get((l) => l.ui.page.glyph.subheader.other)}</h2>
            {/if}
            <!-- Only rectangles have a radius -->
            {#if mode === DrawingMode.Rect || selection.some((s) => s.type === 'rect')}
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
                    change={(val) => {
                        // Update any selected rectangle's rounded corners.
                        for (const shape of selection)
                            if (shape.type === 'rect')
                                shape.corner = val.toNumber();
                    }}
                ></Slider>
            {/if}
            <!-- All shapes but pixels have rotation -->
            {#if mode !== DrawingMode.Pixel || selection.some((s) => s.type !== 'pixel')}
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
                    change={(val) => {
                        // Update any selected shape's rotation
                        for (const shape of selection)
                            if (shape.type !== 'pixel')
                                shape.angle = val.toNumber();
                    }}
                ></Slider>
            {/if}
            {#if mode === DrawingMode.Path || selection.some((s) => s.type === 'path')}
                <label>
                    <Checkbox
                        id="closed-path"
                        bind:on={closed}
                        label={$locales.get(
                            (l) => l.ui.page.glyph.field.closed,
                        )}
                        changed={(on) => {
                            // Update any selected shape's closed state
                            for (const shape of selection)
                                if (shape.type === 'path' && on !== undefined)
                                    shape.closed = on;
                        }}
                    ></Checkbox>{$locales.get(
                        (l) => l.ui.page.glyph.field.closed,
                    )}
                </label>
                <label>
                    <Checkbox
                        id="curved-path"
                        bind:on={curved}
                        label={$locales.get(
                            (l) => l.ui.page.glyph.field.curved,
                        )}
                        changed={(on) => {
                            // Update any selected shape's curved state
                            for (const shape of selection)
                                if (shape.type === 'path' && on !== undefined)
                                    shape.curved = on;
                        }}
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

        label {
            display: flex;
            flex-direction: row;
            align-items: baseline;
        }

        .meta {
            display: flex;
            flex-direction: column;
            gap: var(--wordplay-spacing);
        }

        p {
            margin: 0;
        }
    </style>
{/snippet}

{#snippet meta()}
    {#if pendingPath}
        <Feedback>{$locales.get((l) => l.ui.page.glyph.feedback.end)}</Feedback>
    {/if}
    {#if selection.length >= 1}
        <Feedback
            >{$locales.get((l) => l.ui.page.glyph.feedback.select)}</Feedback
        >
    {/if}
    <MarkupHtmlView
        note
        markup={$locales.get((l) => l.ui.page.glyph.instructions)}
    ></MarkupHtmlView>
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
        onpointerdown={(event) => handlePointerDown(event, false)}
        onpointermove={(event) => handlePointerDown(event, true)}
        onpointerup={handlePointerUp}
    >
        {@render grid()}
        {@html glyphToSVG(glyph, '100%', selection)}
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
            color: var(--wordplay-foreground);
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

        svg .selected {
            stroke: var(--wordplay-highlight-color);
        }
    </style>
{/snippet}

<Page>
    <section>
        <div class="header">
            <Header>{$locales.get((l) => l.ui.page.glyph.header)}</Header>
            <p>{$locales.get((l) => l.ui.page.glyph.prompt)}</p>
            <div class="preview">
                {@html glyphToSVG(glyph, '32px')}
            </div>
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

    .preview {
        width: 32px;
        height: 32px;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        align-self: baseline;
    }

    h2 {
        margin: 0;
    }
</style>
