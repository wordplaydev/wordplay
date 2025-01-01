<script module lang="ts">
    import type { ButtonText, FieldText, ModeText } from '@locale/UITexts';
    export type GlyphPageText = {
        header: string;
        prompt: string;
        instructions: string;
        subheader: {
            shape: string;
        };
        shape: {
            pixel: string;
            rect: string;
            ellipse: string;
            path: string;
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
        button: {
            /** The move selection back button */
            back: ButtonText;
            /** The move selection forward button */
            forward: ButtonText;
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
    type LCH = { l: number; c: number; h: number };
</script>

<script lang="ts">
    import { locales } from '@db/Database';
    import Header from '@components/app/Header.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import TextBox from '@components/widgets/TextBox.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import {
        getPathCenter,
        getSharedColor,
        GlyphSize,
        glyphToSVG,
        moveShape,
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
    import { toTokens } from '@parser/toTokens';
    import Sym from '@nodes/Sym';
    import { v4 as uuidv4 } from 'uuid';
    import Button from '@components/widgets/Button.svelte';
    import { BORROW_SYMBOL, SHARE_SYMBOL } from '@parser/Symbols';

    /** The current name of the shape */
    let name = $state('');

    /** The current description of the shape */
    let description = $state('');

    /** The current list of shapes of the glyph */
    let shapes: GlyphShape[] = $state.raw([]);

    /** The current drawing mode of the editor*/
    let mode: DrawingMode = $state(0);

    /** The current selection of shapes, just pointers to the object, since we will mutate them. */
    let selection: GlyphShape[] = $state.raw([]);

    /** The current copied shapes */
    let copy: GlyphShape[] | undefined = $state(undefined);

    /** The current position for drawing, within the bounds of the glyph grid */
    let drawingCursorPosition = $state({ x: 0, y: 0 });

    /** The relative positions from each selected shape's center, so we can maintain relative positions for multiple selections. */
    let dragOffsets: { x: number; y: number }[] | undefined = $state(undefined);

    /** The current fill color and whether it's on, off, or inherited */
    let currentFill: LCH = $state({
        l: 0.5,
        c: 0,
        h: 0,
    });
    let currentFillSetting: ColorSetting = $state('set');

    /** The current stroke color and whether it's on, off, or inherited  */
    let currentStroke: LCH = $state({ l: 0, c: 0, h: 0 });
    let currentStrokeSetting: ColorSetting = $state('set');

    /** The current stroke width */
    let currentStrokeWidth = $state(1);

    /** The current border radius for rectangles */
    let currentCorner = $state(0);

    /** The current rotation */
    let currentAngle = $state(0);

    /** The closed path state */
    let currentClosed = $state(true);

    /** The curved path state */
    let currentCurved = $state(false);

    /** The HTML element of the canvas */
    let canvasView: HTMLDivElement | null = null;

    /** The pending rectangle or ellipse */
    let pendingRectOrEllipse: GlyphRectangle | GlyphEllipse | undefined =
        $state(undefined);

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
        if (mode !== DrawingMode.Path && pendingPath !== undefined) {
            selection = [pendingPath];
            pendingPath = undefined;
        }
    });

    function validName(name: string) {
        const tokens = toTokens(name);
        return tokens.nextAre(Sym.Name, Sym.End)
            ? true
            : $locales.get((l) => l.ui.page.glyph.feedback.name);
    }
    function validDescription(description: string) {
        return description.length > 0
            ? true
            : $locales.get((l) => l.ui.page.glyph.feedback.description);
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
            id: uuidv4(),
            type: 'pixel',
            center: [drawingCursorPosition.x, drawingCursorPosition.y],
            fill: currentFillSetting === undefined ? null : { ...currentFill },
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
                        s.center[0] !== drawingCursorPosition.x ||
                        s.center[1] !== drawingCursorPosition.y,
                ),
            candidate,
        ];
    }

    function getCurrentFill() {
        return currentFillSetting === 'inherit'
            ? null
            : currentFillSetting === 'none'
              ? undefined
              : { ...currentFill };
    }

    function getCurrentStroke() {
        return currentStrokeSetting === 'none'
            ? undefined
            : {
                  color:
                      currentStrokeSetting === 'inherit'
                          ? null
                          : { ...currentStroke },
                  width: currentStrokeWidth,
              };
    }

    function getCurrentRect(): GlyphRectangle {
        return {
            ...{
                id: uuidv4(),
                type: 'rect',
                center: [drawingCursorPosition.x, drawingCursorPosition.y],
                width: 1,
                height: 1,
            },
            ...(currentFillSetting !== undefined && {
                fill: getCurrentFill(),
            }),
            ...(currentStrokeSetting !== undefined && {
                stroke: getCurrentStroke(),
            }),
            ...(currentCorner !== 1 && { corner: currentCorner }),
            ...(currentAngle !== 0 && { angle: currentAngle }),
        };
    }

    function updatePendingRectOrEllipse() {
        if (pendingRectOrEllipse === undefined) return;
        // Update the pending rect's dimensions to the current pointer position.
        pendingRectOrEllipse.width = Math.max(
            1,
            Math.abs(drawingCursorPosition.x - pendingRectOrEllipse.center[0]) *
                2,
        );
        pendingRectOrEllipse.height = Math.max(
            1,
            Math.abs(drawingCursorPosition.y - pendingRectOrEllipse.center[1]) *
                2,
        );
    }

    function getCurrentEllipse(): GlyphEllipse {
        return {
            id: uuidv4(),
            ...{
                type: 'ellipse',
                center: [drawingCursorPosition.x, drawingCursorPosition.y],
                width: 1,
                height: 1,
            },
            ...(currentFillSetting !== undefined && {
                fill: getCurrentFill(),
            }),
            ...(currentStrokeSetting !== undefined && {
                stroke: getCurrentStroke(),
            }),
            ...(currentAngle !== 0 && { angle: currentAngle }),
        };
    }

    function getCurrentPath(): GlyphPath {
        return {
            id: uuidv4(),
            type: 'path',
            points: [[drawingCursorPosition.x, drawingCursorPosition.y]],
            closed: currentClosed,
            curved: currentCurved,
            ...(currentFillSetting !== undefined && {
                fill: getCurrentFill(),
            }),
            ...(currentStrokeSetting !== undefined && {
                stroke: getCurrentStroke(),
            }),
            ...(currentAngle !== 0 && { angle: currentAngle }),
        };
    }

    function updatePendingPath() {
        if (pendingPath === undefined) return;
        const last = pendingPath.points[pendingPath.points.length - 1];
        // Different point than the last? Record it.
        if (
            last[0] !== drawingCursorPosition.x &&
            last[1] !== drawingCursorPosition.y
        )
            pendingPath.points.push([
                drawingCursorPosition.x,
                drawingCursorPosition.y,
            ]);
    }

    function addShapes(newShapes: GlyphShape | GlyphShape[]) {
        shapes = [
            ...shapes,
            ...(Array.isArray(newShapes) ? newShapes : [newShapes]),
        ];
    }

    function handleArrow(dx: -1 | 0 | 1, dy: -1 | 0 | 1) {
        // Selection? Move the selection in the preferred direction.
        if (selection.length > 0) {
            for (const shape of selection)
                moveShape(shape, dx, dy, 'translate');
        }
        // In all other moves, move the drawing cursor.
        else {
            drawingCursorPosition.y = Math.max(0, drawingCursorPosition.y + dx);
            drawingCursorPosition.y = Math.max(0, drawingCursorPosition.y + dy);
        }
    }

    function handleKey(event: KeyboardEvent) {
        // Handle cursor movement
        if (event.key.startsWith('Arrow')) {
            // Handle keyboard selection
            if (event.shiftKey && shapes.length > 0) {
                // No selection? Select the first shape in the list.
                if (selection.length === 0) {
                    selection = [shapes[0]];
                }
                // Otherwise, move the selection based on the arrow key.
                else {
                    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                        const index = shapes.indexOf(selection[0]);
                        if (index >= 0)
                            selection = [
                                shapes[
                                    index === 0 ? shapes.length - 1 : index - 1
                                ],
                            ];
                    } else if (
                        event.key === 'ArrowDown' ||
                        event.key === 'ArrowRight'
                    ) {
                        const index = shapes.indexOf(selection[0]);
                        selection = [
                            shapes[index === shapes.length - 1 ? 0 : index + 1],
                        ];
                    }
                }
            } else {
                if (event.key === 'ArrowUp') handleArrow(0, -1);
                else if (event.key === 'ArrowDown') handleArrow(0, 1);
                else if (event.key === 'ArrowLeft') handleArrow(-1, 0);
                else if (event.key === 'ArrowRight') handleArrow(1, 0);
                // Pending shape? Update it based on the new position.
                if (pendingRectOrEllipse) updatePendingRectOrEllipse();
            }
            // Swallow the arrow event
            event.stopPropagation();
        }

        // Handle deletion.
        if (event.key === 'Delete' || event.key === 'Backspace') {
            shapes = shapes.filter((s) => !selection.includes(s));
            selection = [];
            event.stopPropagation();
            return;
        }

        // Handle copy
        if (event.key === 'c' && event.metaKey) {
            copy = selection
                .map((s) => structuredClone($state.snapshot(s)) as GlyphShape)
                .map((s) => {
                    s.id = uuidv4();
                    return s;
                });
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        // Handle paste
        if (event.key === 'v' && event.metaKey) {
            if (copy) {
                const copies = copy.map(
                    (s) => structuredClone($state.snapshot(s)) as GlyphShape,
                );
                // Translate the copies down a bit to make them visible.
                for (const shape of copies) {
                    moveShape(shape, 1, 1, 'translate');
                    // Give the shape a new ID.
                    shape.id = uuidv4();
                }
                // Update the copy to the things just copied
                copy = copies;
                // Add the copies t the end of the shape.
                addShapes(copies);
                // Select all the copies so they can be moved.
                selection = [...copies];
            }
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        // Handle select all
        if (event.key === 'a' && event.metaKey) {
            selection = [...shapes];
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        const action = event.key === 'Enter' || event.key === ' ';

        // If in pixel mode, drop a pixel.
        if (mode === DrawingMode.Pixel && action) {
            setPixel();
            event.stopPropagation();
            return;
        }
        // If in rect or ellipse mode...
        else if (
            (mode === DrawingMode.Rect || mode === DrawingMode.Ellipse) &&
            action
        ) {
            // No pending rect? Make one
            if (pendingRectOrEllipse === undefined) {
                pendingRectOrEllipse =
                    mode === DrawingMode.Rect
                        ? getCurrentRect()
                        : getCurrentEllipse();
                addShapes(pendingRectOrEllipse);
            }
            // If there is one, finish it
            else {
                selection = [pendingRectOrEllipse];
                pendingRectOrEllipse = undefined;
                mode = DrawingMode.Select;
            }
            event.stopPropagation();
        }
        // If in path mode, start a path
        else if (mode === DrawingMode.Path && action) {
            if (pendingPath === undefined) {
                pendingPath = getCurrentPath();
                addShapes(pendingPath);
            } else updatePendingPath();
        }
        // If in path mode and key is escape, close the path
        else if (event.key === 'Escape') {
            if (mode === DrawingMode.Path) {
                if (pendingPath) {
                    selection = [pendingPath];
                    pendingPath = undefined;
                    mode = DrawingMode.Select;
                    event.stopPropagation();
                    return;
                }
            }
            if (mode === DrawingMode.Select) {
                selection = [];
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

        // Get the current canvas position.
        const x = Math.floor(
            (event.offsetX / event.currentTarget.clientWidth) * GlyphSize,
        );
        const y = Math.floor(
            (event.offsetY / event.currentTarget.clientHeight) * GlyphSize,
        );

        // Move the position to the pointer
        drawingCursorPosition = {
            x,
            y,
        };

        // Button not down? Don't do anything else.
        if (event.buttons !== 1) return;

        // Swallow the event.
        event.stopPropagation();

        // In pixel mode? Drop a pixel.
        if (mode === DrawingMode.Pixel) {
            setPixel();
            if (canvasView) setKeyboardFocus(canvasView, 'Focus the canvas.');
            return;
        }
        // In rectangle mode? Start or update a rectangle.
        else if (mode === DrawingMode.Rect || mode === DrawingMode.Ellipse) {
            // If there's no pending rect, start one at the current position.
            if (pendingRectOrEllipse === undefined) {
                pendingRectOrEllipse =
                    mode === DrawingMode.Rect
                        ? getCurrentRect()
                        : getCurrentEllipse();
                addShapes(pendingRectOrEllipse);
            } else {
                updatePendingRectOrEllipse();
            }
            return;
        } else if (mode === DrawingMode.Path && !move) {
            if (pendingPath === undefined) {
                pendingPath = getCurrentPath();
                addShapes(pendingPath);
            } else updatePendingPath();

            return;
        } else if (mode === DrawingMode.Select) {
            if (!move) {
                const candidate = document.elementFromPoint(
                    event.clientX,
                    event.clientY,
                );
                let found = false;
                if (candidate instanceof SVGElement) {
                    const svg = candidate.parentElement;
                    if (svg !== null && svg.parentElement === canvasView) {
                        const index = Array.from(svg.childNodes).indexOf(
                            candidate,
                        );
                        if (index >= 0) {
                            const selected = shapes[index];
                            // Don't change the selection if the selected shape is already selected.
                            if (!selection.includes(selected)) {
                                if (event.shiftKey)
                                    selection = [...selection, shapes[index]];
                                else selection = [shapes[index]];
                            }
                            found = true;
                        }
                    }
                }
                if (!found) selection = [];
            }

            // No drag position yet? Set one.
            if (dragOffsets === undefined) {
                dragOffsets = [];
                for (const shape of selection) {
                    switch (shape.type) {
                        // These three are easy.
                        case 'rect':
                        case 'ellipse':
                        case 'pixel':
                            dragOffsets.push({
                                x: x - shape.center[0],
                                y: y - shape.center[1],
                            });
                        case 'path':
                            if (shape.type === 'path') {
                                const center = getPathCenter(shape);
                                dragOffsets.push({
                                    x: x - center[0],
                                    y: y - center[1],
                                });
                            }
                    }
                }
            }
            // Are we moving? Move the selection, accounting for the shape's offsets.
            else {
                for (const [index, shape] of selection.entries())
                    moveShape(
                        shape,
                        x - dragOffsets[index].x,
                        y - dragOffsets[index].y,
                        'move',
                    );
            }
        }
    }

    function handlePointerUp(event: PointerEvent) {
        if (dragOffsets) dragOffsets = undefined;

        // Done? Reset the pending shapes to nothing.
        if (pendingRectOrEllipse) {
            selection = [pendingRectOrEllipse];
            pendingRectOrEllipse = undefined;
            mode = DrawingMode.Select;
            event.stopPropagation();
            return;
        }
    }

    function arrange(direction: 'back' | 'forward') {
        // Move each shape forward or backward in the shape list.
        for (const shape of selection) {
            const currentIndex = shapes.findIndex((s) => s.id === shape.id);
            const newIndex =
                direction === 'back' ? currentIndex - 1 : currentIndex + 1;
            if (newIndex >= 0 && newIndex < shapes.length) {
                shapes.splice(currentIndex, 1);
                shapes.splice(newIndex, 0, shape);
            }
            shapes = [...shapes];
        }
    }
</script>

<svelte:head>
    <title>{$locales.get((l) => l.ui.page.glyph.header)} — {name}</title>
</svelte:head>

<!-- Fill and stroke choosers -->
{#snippet colorChooser(
    state: ColorSetting,
    color: LCH,
    accessor: (locale: LocaleText) => any,
    setState: (state: ColorSetting) => void,
    setColor: (color: LCH) => void,
)}
    <h3>{$locales.get(accessor).label}</h3>
    <Mode
        descriptions={$locales.get(accessor)}
        modes={[
            $locales.get((l) => l.ui.page.glyph.field.none),
            $locales.get((l) => l.ui.page.glyph.field.inherit),
            '🎨',
        ]}
        choice={state === 'none' ? 0 : state === 'inherit' ? 1 : 2}
        select={(choice: number) => {
            setState(choice === 0 ? 'none' : choice === 1 ? 'inherit' : 'set');
        }}
        labeled={false}
    ></Mode>
    {#if state === 'set'}
        <ColorChooser
            lightness={color.l}
            chroma={color.c}
            hue={color.h}
            change={(l, c, h) => {
                setColor({ l, c, h });
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
                id="glyph-name"
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
                id="glyph-description"
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
            select={(choice: number) => {
                mode = choice as DrawingMode;
                if (canvasView)
                    setKeyboardFocus(canvasView, 'Focus the canvas.');
            }}
            labeled={false}
        ></Mode>

        <!-- Say what's being drawn or selected selected -->
        <h2>
            {#if selection.length > 0}
                {Array.from(new Set(selection.map((s) => s.type)))
                    .map((s) => $locales.get((l) => l.ui.page.glyph.shape[s]))
                    .join(', ')}
            {:else if mode === DrawingMode.Pixel}
                {$locales.get((l) => l.ui.page.glyph.shape.pixel)}
            {:else if mode === DrawingMode.Rect}
                {$locales.get((l) => l.ui.page.glyph.shape.rect)}
            {:else if mode === DrawingMode.Ellipse}
                {$locales.get((l) => l.ui.page.glyph.shape.ellipse)}
            {:else if mode === DrawingMode.Path}
                {$locales.get((l) => l.ui.page.glyph.shape.path)}
            {:else}
                —
            {/if}
        </h2>

        <!-- All shapes have fills -->
        {@render colorChooser(
            currentFillSetting,
            // If there's a selection that all has the same color, show the color, otherwise show the current fill color.
            getSharedColor(selection.map((s) => s.fill)) ?? currentFill,
            (l) => l.ui.page.glyph.field.fill,
            (choice) => {
                currentFillSetting = choice;
                for (const shape of selection) shape.fill = getCurrentFill();
            },
            (color) => {
                currentFill = color;
                for (const shape of selection) shape.fill = getCurrentFill();
            },
        )}
        <!-- All shapes except pixels have strokes -->
        {#if mode !== DrawingMode.Pixel || selection.some((s) => s.type !== 'pixel')}
            {@render colorChooser(
                currentStrokeSetting,
                // If there's a selection that all has the same color, show the color, otherwise show the current fill color.
                getSharedColor(
                    selection
                        .filter((s) => s.type !== 'pixel')
                        .map((s) => s.stroke?.color),
                ) ?? currentStroke,
                (l) => l.ui.page.glyph.field.stroke,
                (choice) => {
                    currentStrokeSetting = choice;
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
                                shape.stroke.color = { ...currentStroke };
                            // Otherwise, set the whole stroke.
                            else shape.stroke = getCurrentStroke();
                },
            )}
            <!-- If there's a selection and they have the same stroke width, show that, otherwise show the current stroke value. -->
            <Slider
                label={$locales.get(
                    (l) => l.ui.page.glyph.field.strokeWidth.label,
                )}
                tip={$locales.get((l) => l.ui.page.glyph.field.strokeWidth.tip)}
                min={0}
                max={3}
                increment={0.1}
                precision={1}
                unit={''}
                bind:value={() => {
                    const widths = [
                        ...new Set(
                            selection
                                .filter((s) => s.type !== 'pixel')
                                .map((s) => s.stroke?.width ?? 0),
                        ),
                    ];
                    return (
                        (widths.length === 1 ? widths[0] : undefined) ??
                        currentStrokeWidth
                    );
                },
                (val) => {
                    if (selection.length > 0) {
                        for (const shape of selection)
                            if ('stroke' in shape && shape.stroke !== undefined)
                                shape.stroke.width = val;
                    } else currentStrokeWidth = val;
                }}
            ></Slider>
        {/if}
        {#if mode !== DrawingMode.Pixel}
            <h3>{$locales.get((l) => l.ui.page.glyph.subheader.shape)}</h3>
        {/if}
        <!-- Only rectangles have a radius -->
        {#if mode === DrawingMode.Rect || selection.some((s) => s.type === 'rect')}
            <Slider
                label={$locales.get((l) => l.ui.page.glyph.field.radius.label)}
                tip={$locales.get((l) => l.ui.page.glyph.field.radius.tip)}
                min={0}
                max={5}
                increment={0.1}
                precision={1}
                unit={''}
                bind:value={() => {
                    // Uniform corner value? Show that.
                    const corners = [
                        ...new Set(
                            selection
                                .filter((s) => s.type === 'rect')
                                .map((s) => s.corner ?? 0),
                        ),
                    ];
                    return (
                        (corners.length === 1 ? corners[0] : undefined) ??
                        currentCorner
                    );
                },
                (val) => {
                    if (selection.length > 0) {
                        // Update any selected rectangle's rounded corners.
                        for (const shape of selection)
                            if (shape.type === 'rect') shape.corner = val;
                    } else currentCorner = val;
                }}
            ></Slider>
        {/if}
        <!-- All shapes but pixels have rotation -->
        {#if mode !== DrawingMode.Pixel || selection.some((s) => s.type !== 'pixel')}
            <Slider
                label={$locales.get((l) => l.ui.page.glyph.field.angle.label)}
                tip={$locales.get((l) => l.ui.page.glyph.field.angle.tip)}
                min={0}
                max={359}
                increment={1}
                precision={0}
                unit={''}
                bind:value={() => {
                    // Is there a uniform selected angle? Show that.
                    const angles = [
                        ...new Set(
                            selection
                                .filter((s) => s.type !== 'pixel')
                                .map((s) => s.angle ?? 0)
                                .filter((a) => a !== undefined),
                        ),
                    ];
                    return (
                        (angles.length === 1 ? angles[0] : undefined) ??
                        currentAngle
                    );
                },
                (val) => {
                    if (selection.length > 0) {
                        // Update any selected shape's rotation
                        for (const shape of selection)
                            if (shape.type !== 'pixel') shape.angle = val;
                    } else currentAngle = val;
                }}
            ></Slider>
        {/if}
        {#if mode === DrawingMode.Path || selection.some((s) => s.type === 'path')}
            <label>
                <Checkbox
                    id="closed-path"
                    bind:on={() => {
                        // If the selection has an identical closed state, set the current closed state to it
                        const closed = [
                            ...new Set(
                                selection
                                    .filter((s) => s.type === 'path')
                                    .map((s) => s.closed),
                            ),
                        ];
                        return (
                            (closed.length === 1 ? closed[0] : undefined) ??
                            currentClosed
                        );
                    },
                    (on) => {
                        if (selection.length > 0) {
                            // Update any selected shape's closed state
                            for (const shape of selection)
                                if (shape.type === 'path' && on !== undefined)
                                    shape.closed = on;
                        } else currentCurved = on;
                    }}
                    label={$locales.get((l) => l.ui.page.glyph.field.closed)}
                ></Checkbox>{$locales.get((l) => l.ui.page.glyph.field.closed)}
            </label>
            <label>
                <Checkbox
                    id="curved-path"
                    bind:on={() => {
                        // If there's a selection and they have the same curved state, show that, otherwise show the current curved value.
                        const curves = [
                            ...new Set(
                                selection
                                    .filter((s) => s.type === 'path')
                                    .map((s) => s.curved),
                            ),
                        ];
                        return (
                            (curves.length === 1 ? curves[0] : undefined) ??
                            currentCurved
                        );
                    },
                    (on) => {
                        // If there's a selection, update the value for all selected shapes.
                        if (selection.length > 0) {
                            // Update any selected shape's curved state
                            for (const shape of selection)
                                if (shape.type === 'path' && on !== undefined)
                                    shape.curved = on;
                        }
                        // Otherwise update the current curved value.
                        else currentCurved = on;
                    }}
                    label={$locales.get((l) => l.ui.page.glyph.field.curved)}
                ></Checkbox>{$locales.get(
                    (l) => l.ui.page.glyph.field.curved,
                )}</label
            >
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

{#snippet canvas()}
    <div class="toolbar">
        <Button
            background
            tip={$locales.get((l) => l.ui.page.glyph.button.back.tip)}
            action={() => arrange('back')}
            active={selection.length > 0 && shapes.length > 1}
            >{SHARE_SYMBOL}
            {$locales.get((l) => l.ui.page.glyph.button.back.label)}</Button
        >
        <Button
            background
            tip={$locales.get((l) => l.ui.page.glyph.button.forward.tip)}
            action={() => arrange('forward')}
            active={selection.length > 0 && shapes.length > 1}
            >{BORROW_SYMBOL}
            {$locales.get((l) => l.ui.page.glyph.button.forward.label)}</Button
        >
    </div>
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
                style:left="{(100 * drawingCursorPosition.x) / GlyphSize}%"
                style:top="{(100 * drawingCursorPosition.y) / GlyphSize}%"
                style:width={'calc(100% / ' + GlyphSize + ')'}
                style:height={'calc(100% / ' + GlyphSize + ')'}
            ></div>
        {/if}
        <div class="notes">
            {#if pendingPath}
                <Feedback
                    >{$locales.get(
                        (l) => l.ui.page.glyph.feedback.end,
                    )}</Feedback
                >
            {/if}
        </div>
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

        .toolbar {
            display: flex;
            flex-direction: row;
            gap: var(--wordplay-spacing);
            justify-content: center;
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

        .notes {
            position: absolute;
            top: -2em;
            left: var(--wordplay-spacing);
            right: var(--wordplay-spacing);
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
                <MarkupHtmlView
                    note
                    markup={$locales.get((l) => l.ui.page.glyph.instructions)}
                ></MarkupHtmlView>
                {#if selection.length >= 1}
                    <Feedback
                        >{$locales.get(
                            (l) => l.ui.page.glyph.feedback.select,
                        )}</Feedback
                    >
                {/if}
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

    h2,
    h3 {
        margin: 0;
    }
</style>
