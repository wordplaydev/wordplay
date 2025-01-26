<script module lang="ts">
    import type { ButtonText, FieldText, ModeText } from '@locale/UITexts';
    import type { Template } from '@locale/LocaleText';
    export type CharacterPageText = {
        header: string;
        prompt: string;
        instructions: {
            empty: string;
            unselected: string;
            selected: string;
            pixel: string;
            rect: string;
            ellipse: string;
            path: string;
        };
        shape: {
            shape: string;
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
            /** The clear pixels button */
            clearPixels: ButtonText;
            /** The clear all button */
            clear: ButtonText;
            /** The undo tooltip */
            undo: string;
            /** The redo tooltip */
            redo: string;
        };
        feedback: {
            /** When the name isn't a valid Wordplay name */
            name: string;
            /** When the description is empty */
            description: string;
            /** When completing a path, instructions on how to end it. */
            end: string;
            /** Couldn't load the character */
            loadfail: string;
            /** The character doesn't exist */
            notfound: string;
            /** Not logged in */
            unauthenticated: string;
        };
        announce: {
            /** When cursor position changes $1 x, $2: y. */
            position: Template;
            /** When selection changes. $1 is list of shape types. */
            selection: Template;
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
    import { CharactersDB, locales } from '@db/Database';
    import Header from '@components/app/Header.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import TextBox from '@components/widgets/TextBox.svelte';
    import Feedback from '@components/app/Feedback.svelte';
    import {
        getPathCenter,
        getSharedColor,
        CharacterSize,
        characterToSVG,
        moveShape,
        pixelsAreEqual,
        type Character,
        type CharacterEllipse,
        type CharacterPath,
        type CharacterPixel,
        type CharacterRectangle,
        type CharacterShape,
    } from '../../../characters/character';
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
    import Button from '@components/widgets/Button.svelte';
    import {
        BORROW_SYMBOL,
        CANCEL_SYMBOL,
        REDO_SYMBOL,
        SHARE_SYMBOL,
        UNDO_SYMBOL,
    } from '@parser/Symbols';
    import { getAnnounce, getUser } from '@components/project/Contexts';
    import { untrack } from 'svelte';
    import { page } from '$app/state';
    import Spinning from '@components/app/Spinning.svelte';
    import Locales from '@locale/Locales';

    /** So we know who's making this.*/
    const user = getUser();

    /** For announcing changes.*/
    const announce = getAnnounce();

    /** The current name of the shape */
    let name = $state('');

    /** The current description of the shape */
    let description = $state('');

    /** The current list of shapes of the character */
    let shapes: CharacterShape[] = $state([]);

    /** The history of shapes, to support undo/redo */
    let history: CharacterShape[][] = $state([]);

    /** Where we are in the undo history, to support redo */
    let historyIndex = $state(0);

    /** The current drawing mode of the editor*/
    let mode: DrawingMode = $state(DrawingMode.Pixel);

    /** The current selection of shapes, just pointers to the object, since we will mutate them. */
    let selection: CharacterShape[] = $state([]);

    /** The current copied shapes */
    let copy: CharacterShape[] | undefined = $state(undefined);

    /** The current position for drawing, within the bounds of the character grid */
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
    let canvasView: HTMLDivElement | null = $state(null);

    /** The pending rectangle or ellipse */
    let pendingRectOrEllipse:
        | CharacterRectangle
        | CharacterEllipse
        | undefined = $state(undefined);

    /** The pendig path */
    let pendingPath: CharacterPath | undefined = $state(undefined);

    /** The persisted character */
    let persisted: Character | 'loading' | 'failed' | 'unknown' =
        $state('loading');

    /** The list of viewers, derived from the projects using it */
    let viewers: string[] = $derived.by(() =>
        typeof persisted === 'string' ? [] : persisted.viewers,
    );

    /** The list of projects using the character */
    let projects: string[] = $derived.by(() =>
        typeof persisted === 'string' ? [] : persisted.projects,
    );

    /** Whether the project is public */
    let isPublic: boolean = $state(false);

    /** Always have an up to date character to render and save */
    let editedCharacter: Character = $derived({
        id: page.params.id,
        owner: $user?.uid ?? null,
        updated: Date.now(),
        name,
        description,
        shapes,
        viewers,
        projects,
        public: isPublic,
    });

    /**
     * When the edited character changes and we have loaded the persisted one,
     * tell the database about the new value.
     * */
    $effect(() => {
        // IF th
        if (editedCharacter && typeof persisted !== 'string')
            untrack(() =>
                CharactersDB.updateCharacter(
                    $state.snapshot(editedCharacter) as Character,
                    true,
                ),
            );
    });

    /** When the page loads or its id changes, load the persisted character */
    $effect(() => {
        const id = page.params.id;
        // Don't track the below; it's just a one-time load unless the id changes.
        if ($user) {
            untrack(() =>
                CharactersDB.getByIDOrName(id).then((loadedCharacter) => {
                    persisted =
                        loadedCharacter === undefined
                            ? 'failed'
                            : loadedCharacter === null
                              ? 'unknown'
                              : loadedCharacter;
                    if (loadedCharacter) {
                        name = loadedCharacter.name;
                        description = loadedCharacter.description;
                        shapes = loadedCharacter.shapes;
                    }
                }),
            );
        }
    });

    // If the mode changes, end the pending path.
    $effect(() => {
        if (mode !== DrawingMode.Path && pendingPath !== undefined) {
            selection = [pendingPath];
            pendingPath = undefined;
        }
    });

    // If the mode changes to pixel, and the fill is set to none, set it to set.
    $effect(() => {
        if (mode === DrawingMode.Pixel && currentFillSetting === 'none')
            currentFillSetting = 'set';
    });

    // When the selection changes, announce it.
    $effect(() => {
        selection;
        untrack(() => {
            if ($announce)
                $announce(
                    'new selection',
                    $locales.getLanguages()[0],
                    $locales
                        .concretize(
                            $locales.get(
                                (l) => l.ui.page.character.announce.selection,
                            ),
                            selection.length === 0
                                ? undefined
                                : selection
                                      .map((s) =>
                                          $locales.get(
                                              (l) =>
                                                  l.ui.page.character.shape[
                                                      s.type
                                                  ],
                                          ),
                                      )
                                      .join(', '),
                        )
                        .toText(),
                );
        });
    });

    function validName(name: string) {
        const tokens = toTokens(name);
        return tokens.nextAre(Sym.Name, Sym.End)
            ? true
            : $locales.get((l) => l.ui.page.character.feedback.name);
    }
    function validDescription(description: string) {
        return description.length > 0
            ? true
            : $locales.get((l) => l.ui.page.character.feedback.description);
    }

    let error = $derived(
        !validName(name)
            ? $locales.get((l) => l.ui.page.character.feedback.name)
            : !validDescription(description)
              ? $locales.get((l) => l.ui.page.character.feedback.description)
              : undefined,
    );

    /** Centralized shape list updating to support undo/redo. */
    function setShapes(newShapes: CharacterShape[]) {
        // Remove the future if we're in the past
        if (historyIndex < history.length - 1)
            history = history.slice(0, historyIndex);

        // Update the shapes.
        shapes = newShapes;

        // Clone the current shapes and add them to the history the shapes to the history
        history = [
            ...history,
            structuredClone($state.snapshot(shapes)) as CharacterShape[],
        ];

        // Move the index to the present.
        historyIndex = history.length - 1;

        // No more than 100 steps back, just to be conservative about memory.
        if (history.length > 100) {
            history.shift();
        }
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            shapes = history[historyIndex];
        }
    }

    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            shapes = history[historyIndex];
        }
    }

    /** Set the pixel at the current position and fill. */
    function setPixel() {
        const candidate: CharacterPixel = {
            type: 'pixel',
            center: [drawingCursorPosition.x, drawingCursorPosition.y],
            fill: currentFillSetting === undefined ? null : { ...currentFill },
        };
        const match = shapes
            // Remove pixels at the same position
            .find((s) => s.type === 'pixel' && pixelsAreEqual(s, candidate));
        // Already an identical pixel? No need to rerender.
        if (match) return;

        setShapes([
            ...shapes
                // Remove pixels at the same position
                .filter(
                    (s) =>
                        s.type !== 'pixel' ||
                        s.center[0] !== drawingCursorPosition.x ||
                        s.center[1] !== drawingCursorPosition.y,
                ),
            candidate,
        ]);
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

    function getCurrentRect(): CharacterRectangle {
        return {
            ...{
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

    function getCurrentEllipse(): CharacterEllipse {
        return {
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

    function getCurrentPath(): CharacterPath {
        return {
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

    function addShapes(newShapes: CharacterShape | CharacterShape[]) {
        setShapes([
            ...shapes,
            ...(Array.isArray(newShapes) ? newShapes : [newShapes]),
        ]);
    }

    function handleArrow(dx: -1 | 0 | 1, dy: -1 | 0 | 1) {
        // Selection? Move the selection in the preferred direction.
        if (selection.length > 0) {
            for (const shape of selection)
                moveShape(shape, dx, dy, 'translate');
            setShapes([...shapes]);
        }
        // In all other moves, move the drawing cursor.
        else {
            drawingCursorPosition = {
                x: Math.max(0, drawingCursorPosition.x + dx),
                y: Math.max(0, drawingCursorPosition.y + dy),
            };

            if ($announce)
                $announce(
                    'new drawing cursor position',
                    $locales.getLanguages()[0],
                    $locales
                        .concretize(
                            $locales.get(
                                (l) => l.ui.page.character.announce.position,
                            ),
                            drawingCursorPosition.x,
                            drawingCursorPosition.y,
                        )
                        .toText(),
                );
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
            event.preventDefault();
        }

        // Handle undo/redo
        if (event.key === 'z' && event.metaKey) {
            if (event.shiftKey) redo();
            else undo();
            event.stopPropagation();
            event.preventDefault();
            return;
        }
        if (event.key === 'y' && event.metaKey) {
            redo();
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        // Handle copy
        if (event.key === 'c' && event.metaKey) {
            copy = selection.map(
                (s) => structuredClone($state.snapshot(s)) as CharacterShape,
            );
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        // Handle paste
        if (event.key === 'v' && event.metaKey) {
            if (copy) {
                const copies = copy.map(
                    (s) =>
                        structuredClone($state.snapshot(s)) as CharacterShape,
                );
                // Translate the copies down a bit to make them visible.
                for (const shape of copies) {
                    moveShape(shape, 1, 1, 'translate');
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
        else if (mode === DrawingMode.Path) {
            if (action) {
                if (pendingPath === undefined) {
                    pendingPath = getCurrentPath();
                    addShapes(pendingPath);
                } else updatePendingPath();
            } else if (event.key === 'Delete' || event.key === 'Backspace') {
                if (pendingPath && pendingPath.points.length > 1) {
                    pendingPath.points.pop();
                    event.stopPropagation();
                    return;
                }
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
            }
        }
        if (mode === DrawingMode.Select) {
            if (event.key === 'Escape') {
                selection = [];
                event.stopPropagation();
                return;
            }
            // Handle deletion.
            else if (event.key === 'Delete' || event.key === 'Backspace') {
                setShapes(shapes.filter((s) => !selection.includes(s)));
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
            (event.offsetX / event.currentTarget.clientWidth) * CharacterSize,
        );
        const y = Math.floor(
            (event.offsetY / event.currentTarget.clientHeight) * CharacterSize,
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
            // Snapshot for history.
            setShapes([...shapes]);
            return;
        }
    }

    function arrange(direction: 'back' | 'forward') {
        // Move each shape forward or backward in the shape list.
        for (const shape of selection) {
            const currentIndex = shapes.findIndex((s) => s === shape);
            const newIndex =
                direction === 'back' ? currentIndex - 1 : currentIndex + 1;
            if (newIndex >= 0 && newIndex < shapes.length) {
                const newShapes = [...shapes];
                newShapes.splice(currentIndex, 1);
                newShapes.splice(newIndex, 0, shape);
                setShapes([...newShapes]);
            }
        }
    }
</script>

<svelte:head>
    <title>{$locales.get((l) => l.ui.page.character.header)} — {name}</title>
</svelte:head>

<!-- Fill and stroke choosers -->
{#snippet colorChooser(
    locales: Locales,
    state: ColorSetting,
    color: LCH,
    /** Whether no fill is allowed */
    none: boolean,
    accessor: (locale: LocaleText) => any,
    setState: (state: ColorSetting) => void,
    setColor: (color: LCH) => void,
)}
    <h3>{locales.get(accessor).label}</h3>
    <Mode
        descriptions={locales.get(accessor)}
        modes={[
            '🎨',
            locales.get((l) => l.ui.page.character.field.inherit),
            ...(none
                ? [locales.get((l) => l.ui.page.character.field.none)]
                : []),
        ]}
        choice={state === 'none' ? 2 : state === 'inherit' ? 1 : 0}
        select={(choice: number) => {
            setState(choice === 2 ? 'none' : choice === 1 ? 'inherit' : 'set');
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
    <div aria-hidden="true" class="grid">
        <!-- Render gridlines below everything -->
        {#each { length: CharacterSize }, x}<div
                class="line yline"
                style="left: {100 * (x / CharacterSize)}%"
            ></div>{/each}{#each { length: CharacterSize }, y}<div
                class="line xline"
                style="top: {100 * (y / CharacterSize)}%"
            ></div>{/each}
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
                id="character-name"
                bind:text={name}
                placeholder={$locales.get(
                    (l) => l.ui.page.character.field.name.placeholder,
                )}
                description={$locales.get(
                    (l) => l.ui.page.character.field.name.description,
                )}
                done={() => {}}
                validator={validName}
            ></TextField>
            <TextBox
                id="character-description"
                bind:text={description}
                placeholder={$locales.get(
                    (l) => l.ui.page.character.field.description.placeholder,
                )}
                description={$locales.get(
                    (l) => l.ui.page.character.field.description.description,
                )}
                done={() => {}}
                validator={validDescription}
            ></TextBox>
            {#if error}
                <Feedback>{error}</Feedback>
            {/if}
        </div>
        <h2>{$locales.get((l) => l.ui.page.character.field.mode).label}</h2>
        <Mode
            descriptions={$locales.get((l) => l.ui.page.character.field.mode)}
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
                    .map((s) =>
                        $locales.get((l) => l.ui.page.character.shape[s]),
                    )
                    .join(', ')}
            {:else if mode === DrawingMode.Pixel}
                {$locales.get((l) => l.ui.page.character.shape.pixel)}
            {:else if mode === DrawingMode.Rect}
                {$locales.get((l) => l.ui.page.character.shape.rect)}
            {:else if mode === DrawingMode.Ellipse}
                {$locales.get((l) => l.ui.page.character.shape.ellipse)}
            {:else if mode === DrawingMode.Path}
                {$locales.get((l) => l.ui.page.character.shape.path)}
            {:else}
                {$locales.get((l) => l.ui.page.character.field.mode.modes[0])}…
            {/if}
        </h2>

        {#if mode !== DrawingMode.Select || selection.length > 0}
            <!-- All shapes have fills -->
            {@render colorChooser(
                $locales,
                currentFillSetting,
                // If there's a selection that all has the same color, show the color, otherwise show the current fill color.
                getSharedColor(selection.map((s) => s.fill)) ?? currentFill,
                mode !== DrawingMode.Pixel,
                (l) => l.ui.page.character.field.fill,
                (choice) => {
                    currentFillSetting = choice;
                    for (const shape of selection)
                        shape.fill = getCurrentFill();
                    setShapes([...shapes]);
                },
                (color) => {
                    currentFill = color;
                    for (const shape of selection)
                        shape.fill = getCurrentFill();
                    setShapes([...shapes]);
                },
            )}
            <!-- All shapes except pixels have strokes -->
            {#if mode !== DrawingMode.Pixel || selection.some((s) => s.type !== 'pixel')}
                {@render colorChooser(
                    $locales,
                    currentStrokeSetting,
                    // If there's a selection that all has the same color, show the color, otherwise show the current fill color.
                    getSharedColor(
                        selection
                            .filter((s) => s.type !== 'pixel')
                            .map((s) => s.stroke?.color),
                    ) ?? currentStroke,
                    true,
                    (l) => l.ui.page.character.field.stroke,
                    (choice) => {
                        currentStrokeSetting = choice;
                        if (selection.length > 0) {
                            for (const shape of selection)
                                if (shape.type !== 'pixel')
                                    shape.stroke = getCurrentStroke();
                            setShapes([...shapes]);
                        }
                    },
                    (color) => {
                        currentStroke = color;
                        if (selection.length > 0) {
                            for (const shape of selection)
                                if (shape.type !== 'pixel')
                                    if (shape.stroke)
                                        // Already a stroke? Just set the color.
                                        shape.stroke.color = {
                                            ...currentStroke,
                                        };
                                    // Otherwise, set the whole stroke.
                                    else shape.stroke = getCurrentStroke();
                            setShapes([...shapes]);
                        }
                    },
                )}
                <!-- If there's a selection and they have the same stroke width, show that, otherwise show the current stroke value. -->
                <Slider
                    label={$locales.get(
                        (l) => l.ui.page.character.field.strokeWidth.label,
                    )}
                    tip={$locales.get(
                        (l) => l.ui.page.character.field.strokeWidth.tip,
                    )}
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
                                if (
                                    'stroke' in shape &&
                                    shape.stroke !== undefined
                                )
                                    shape.stroke.width = val;
                        } else currentStrokeWidth = val;
                    }}
                    release={() => setShapes([...shapes])}
                ></Slider>
            {/if}
            {#if mode !== DrawingMode.Pixel}
                <h3>{$locales.get((l) => l.ui.page.character.shape.shape)}</h3>
            {/if}
            <!-- Only rectangles have a radius -->
            {#if mode === DrawingMode.Rect || selection.some((s) => s.type === 'rect')}
                <Slider
                    label={$locales.get(
                        (l) => l.ui.page.character.field.radius.label,
                    )}
                    tip={$locales.get(
                        (l) => l.ui.page.character.field.radius.tip,
                    )}
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
                    release={() => setShapes([...shapes])}
                ></Slider>
            {/if}
            <!-- All shapes but pixels have rotation -->
            {#if mode !== DrawingMode.Pixel || selection.some((s) => s.type !== 'pixel')}
                <Slider
                    label={$locales.get(
                        (l) => l.ui.page.character.field.angle.label,
                    )}
                    tip={$locales.get(
                        (l) => l.ui.page.character.field.angle.tip,
                    )}
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
                    release={() => setShapes([...shapes])}
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
                                    if (
                                        shape.type === 'path' &&
                                        on !== undefined
                                    )
                                        shape.closed = on;
                                setShapes([...shapes]);
                            } else currentCurved = on;
                        }}
                        label={$locales.get(
                            (l) => l.ui.page.character.field.closed,
                        )}
                    ></Checkbox>{$locales.get(
                        (l) => l.ui.page.character.field.closed,
                    )}
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
                                    if (
                                        shape.type === 'path' &&
                                        on !== undefined
                                    )
                                        shape.curved = on;
                                setShapes([...shapes]);
                            }
                            // Otherwise update the current curved value.
                            else currentCurved = on;
                        }}
                        label={$locales.get(
                            (l) => l.ui.page.character.field.curved,
                        )}
                    ></Checkbox>{$locales.get(
                        (l) => l.ui.page.character.field.curved,
                    )}</label
                >
            {/if}
        {/if}
    </div>

    <style>
        .palette {
            min-width: 10em;
            width: 40vw;
            max-width: 20em;
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

<Page>
    <section>
        <div class="header">
            <Header>{$locales.get((l) => l.ui.page.character.header)}</Header>
            <p>{$locales.get((l) => l.ui.page.character.prompt)}</p>
            <div class="preview">
                {@html characterToSVG(editedCharacter, '32px')}
            </div>
        </div>
        {#if $user === null}
            <Feedback
                >{$locales.get(
                    (l) => l.ui.page.character.feedback.unauthenticated,
                )}</Feedback
            >
        {:else if persisted === 'loading'}
            <Spinning></Spinning>
        {:else if persisted === 'failed'}
            <Feedback
                >{$locales.get(
                    (l) => l.ui.page.character.feedback.loadfail,
                )}</Feedback
            >
        {:else if persisted === 'unknown'}
            <Feedback
                >{$locales.get(
                    (l) => l.ui.page.character.feedback.notfound,
                )}</Feedback
            >
        {:else}
            <div class="editor">
                <div class="content">
                    <div class="toolbar">
                        <Button
                            tip={$locales.get(
                                (l) => l.ui.page.character.button.undo,
                            )}
                            action={() => undo()}
                            active={historyIndex > 0}>{UNDO_SYMBOL}</Button
                        >
                        <Button
                            tip={$locales.get(
                                (l) => l.ui.page.character.button.redo,
                            )}
                            action={() => redo()}
                            active={historyIndex < history.length - 1}
                            >{REDO_SYMBOL}
                        </Button>
                        <Button
                            tip={$locales.get(
                                (l) => l.ui.page.character.button.back.tip,
                            )}
                            action={() => arrange('back')}
                            active={selection.length > 0 && shapes.length > 1}
                            >{SHARE_SYMBOL}
                            {$locales.get(
                                (l) => l.ui.page.character.button.back.label,
                            )}</Button
                        >
                        <Button
                            tip={$locales.get(
                                (l) => l.ui.page.character.button.forward.tip,
                            )}
                            action={() => arrange('forward')}
                            active={selection.length > 0 && shapes.length > 1}
                            >{BORROW_SYMBOL}
                            {$locales.get(
                                (l) => l.ui.page.character.button.forward.label,
                            )}</Button
                        >
                        <Button
                            tip={$locales.get(
                                (l) =>
                                    l.ui.page.character.button.clearPixels.tip,
                            )}
                            action={() => {
                                setShapes(
                                    shapes.filter((s) => s.type !== 'pixel'),
                                );
                            }}
                            active={shapes.some((s) => s.type === 'pixel')}
                            >{CANCEL_SYMBOL}
                            {$locales.get(
                                (l) =>
                                    l.ui.page.character.button.clearPixels
                                        .label,
                            )}</Button
                        >
                        <Button
                            tip={$locales.get(
                                (l) => l.ui.page.character.button.clear.tip,
                            )}
                            action={() => {
                                setShapes([]);
                            }}
                            active={shapes.length > 0}
                            >{CANCEL_SYMBOL}
                            {$locales.get(
                                (l) => l.ui.page.character.button.clear.label,
                            )}</Button
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
                        onpointerdown={(event) =>
                            handlePointerDown(event, false)}
                        onpointermove={(event) =>
                            handlePointerDown(event, true)}
                        onpointerup={handlePointerUp}
                    >
                        {@render grid()}
                        {@html characterToSVG(
                            editedCharacter,
                            '100%',
                            selection,
                        )}
                        {#if mode !== DrawingMode.Select}
                            <div
                                class="position"
                                style:left="{(100 * drawingCursorPosition.x) /
                                    CharacterSize}%"
                                style:top="{(100 * drawingCursorPosition.y) /
                                    CharacterSize}%"
                                style:width={'calc(100% / ' +
                                    CharacterSize +
                                    ')'}
                                style:height={'calc(100% / ' +
                                    CharacterSize +
                                    ')'}
                            ></div>
                        {/if}
                        {#if pendingPath}
                            <div class="notes">
                                <Feedback
                                    >{$locales.get(
                                        (l) => l.ui.page.character.feedback.end,
                                    )}</Feedback
                                >
                            </div>
                        {/if}
                    </div>
                    <MarkupHtmlView
                        markup={mode === DrawingMode.Select &&
                        shapes.length === 0
                            ? $locales.get(
                                  (l) => l.ui.page.character.instructions.empty,
                              )
                            : mode === DrawingMode.Select &&
                                shapes.length > 0 &&
                                selection.length === 0
                              ? $locales.get(
                                    (l) =>
                                        l.ui.page.character.instructions
                                            .unselected,
                                )
                              : mode === DrawingMode.Select &&
                                  shapes.length > 0 &&
                                  selection.length > 0
                                ? $locales.get(
                                      (l) =>
                                          l.ui.page.character.instructions
                                              .selected,
                                  )
                                : mode === DrawingMode.Pixel
                                  ? $locales.get(
                                        (l) =>
                                            l.ui.page.character.instructions
                                                .pixel,
                                    )
                                  : mode === DrawingMode.Rect
                                    ? $locales.get(
                                          (l) =>
                                              l.ui.page.character.instructions
                                                  .rect,
                                      )
                                    : mode === DrawingMode.Ellipse
                                      ? $locales.get(
                                            (l) =>
                                                l.ui.page.character.instructions
                                                    .ellipse,
                                        )
                                      : $locales.get(
                                            (l) =>
                                                l.ui.page.character.instructions
                                                    .path,
                                        )}
                    ></MarkupHtmlView>
                </div>
                {@render palette()}
            </div>
        {/if}
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
        width: 60vw;
        min-width: 20em;
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

    .canvas {
        position: relative;
        width: 100%;
        height: 100%;
        aspect-ratio: 1/1;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        /* Set a current color to make strokes and fills using current color visible */
        color: var(--wordplay-background);
    }

    .canvas:focus {
        outline: var(--wordplay-focus-color) solid var(--wordplay-focus-width);
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

    .canvas :global(svg) {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        color: var(--wordplay-foreground);
    }

    :global(.canvas svg .selected) {
        stroke: var(--wordplay-highlight-color);
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

    .notes {
        position: absolute;
        top: -2em;
        left: var(--wordplay-spacing);
        right: var(--wordplay-spacing);
    }
</style>
