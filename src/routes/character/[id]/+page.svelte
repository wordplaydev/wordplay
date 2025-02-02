<script module lang="ts">
    import type {
        ButtonText,
        DialogText,
        FieldText,
        ModeText,
    } from '@locale/UITexts';
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
        share: {
            dialog: DialogText;
            button: ButtonText;
            delete: ButtonText;
            public: ModeText<string[]>;
            collaborators: string;
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
            /** Width slider */
            width: {
                label: string;
                tip: string;
            };
            /** Height slider */
            height: {
                label: string;
                tip: string;
            };
            /** Closed path label */
            closed: string;
        };
        button: {
            /** The move selection back button */
            back: ButtonText;
            /** The move to back button */
            toBack: ButtonText;
            /** The move selection forward button */
            forward: ButtonText;
            /** The move to front button */
            toFront: ButtonText;
            /** Copy button text */
            copy: ButtonText;
            /** Paste button text */
            paste: ButtonText;
            /** The clear pixels button */
            clearPixels: ButtonText;
            /** The clear all button */
            clear: ButtonText;
            /** The undo tooltip */
            undo: ButtonText;
            /** The redo tooltip */
            redo: ButtonText;
            /** The select all button */
            all: ButtonText;
            /** End path button */
            end: ButtonText;
            /** Flip path horizontal */
            horizontal: ButtonText;
            /** Flip path vertical */
            vertical: ButtonText;
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
            /** Not saving because name is taken */
            taken: string;
            /** Not saving because not authenticated, invalid name or description. */
            unsaved: string;
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
    } from '../../../db/characters/Character';
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
        ALL_SYMBOL,
        BORROW_SYMBOL,
        CANCEL_SYMBOL,
        COPY_SYMBOL,
        ERASE_SYMBOL,
        GLOBE1_SYMBOL,
        PASTE_SYMBOL,
        REDO_SYMBOL,
        SHARE_SYMBOL,
        UNDO_SYMBOL,
    } from '@parser/Symbols';
    import { getAnnounce, getUser } from '@components/project/Contexts';
    import { untrack } from 'svelte';
    import { page } from '$app/state';
    import Spinning from '@components/app/Spinning.svelte';
    import Locales from '@locale/Locales';
    import RootView from '@components/project/RootView.svelte';
    import { toProgram } from '@parser/parseProgram';
    import ConceptLink, { CharacterName } from '@nodes/ConceptLink';
    import { Basis } from '@basis/Basis';
    import Dialog from '@components/widgets/Dialog.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import CreatorList from '@components/project/CreatorList.svelte';
    import Labeled from '@components/widgets/Labeled.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import { goto } from '$app/navigation';

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
    let mode: DrawingMode = $state(DrawingMode.Select);

    /** The current selection of shapes, just pointers to the object, since we will mutate them. */
    let selection: CharacterShape[] = $state([]);

    /** The current copied shapes */
    let copy: CharacterShape[] | undefined = $state(undefined);

    /** The current position for drawing, within the bounds of the character grid */
    let drawingCursorPosition = $state({ x: 0, y: 0 });

    /** The relative positions from each selected shape's center, so we can maintain relative positions for multiple selections. */
    let dragOffsets: { x: number; y: number }[] | undefined = $state(undefined);

    /** Whether we are doing the first drag */
    let firstDrag = $state(false);

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
    let persisted = $state<Character | 'loading' | 'failed' | 'unknown'>(
        'loading',
    );

    /** The list of collaborators */
    let collaborators: string[] = $state([]);

    /** Whether the project is public */
    let isPublic: boolean = $state(false);

    /** Always have an up to date character to render and save */
    let editedCharacter: Character | null = $derived(
        $user === null || $user.email === null || typeof persisted === 'string'
            ? null
            : {
                  ...persisted,
                  updated: Date.now(),
                  name: `${Creator.getUsername($user.email)}/${name}`,
                  description,
                  shapes,
                  collaborators: collaborators,
                  public: isPublic,
              },
    );

    /** The colors used by the current shapes */
    let colors: [number, number, number][] = $derived.by(() => {
        return (
            shapes
                // Convert all the shapes to a list of colors
                .map((s) => {
                    const colors: { l: number; c: number; h: number }[] = [];
                    switch (s.type) {
                        case 'pixel':
                            if (s.fill) colors.push(s.fill);
                            break;
                        case 'rect':
                        case 'ellipse':
                        case 'path':
                            if (s.fill) colors.push(s.fill);
                            if (s.stroke && s.stroke.color !== null)
                                colors.push(s.stroke.color);
                    }
                    return colors;
                })
                // Flatten it to a list of colors
                .flat()
                // Remove the null colors
                .filter((c) => c !== null)
                // Convert to color list
                .map((c) => [c.l * 100, c.c, c.h] as [number, number, number])
                // Remove duplicates
                .filter(
                    (c, index, list) =>
                        !list
                            .slice(index + 1)
                            .some(
                                (c2) =>
                                    c[0] == c2[0] &&
                                    c[1] == c2[1] &&
                                    c[2] == c2[2],
                            ),
                )
        );
    });

    let nameAvailable = $derived.by(() => {
        const c = CharactersDB.getEditableCharacterWithName(name);
        return (
            c === undefined ||
            (editedCharacter !== null && c.id === editedCharacter.id)
        );
    });

    let savable = $derived(
        $user !== null &&
            $user.email !== null &&
            isValidName(name) === true &&
            nameAvailable &&
            isValidDescription(description) === true,
    );

    let timeout: NodeJS.Timeout | null = null;
    function saveLater() {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            CharactersDB.updateCharacter(
                $state.snapshot(editedCharacter) as Character,
                true,
            );
        }, 1000);
    }

    /**
     * When the edited character changes and we have loaded the persisted one,
     * tell the database about the new value.
     * */
    $effect(() => {
        if (savable && editedCharacter !== null) untrack(saveLater);
    });

    /** When the page loads or its id changes, load the persisted character */
    $effect(() => {
        const id = page.params.id;
        // Don't track the below; it's just a one-time load unless the id changes.
        if ($user) {
            CharactersDB.getByID(id).then((loadedCharacter) => {
                persisted =
                    loadedCharacter === undefined
                        ? 'failed'
                        : loadedCharacter === null
                          ? 'unknown'
                          : loadedCharacter;
                if (loadedCharacter) {
                    name = loadedCharacter.name.split('/').at(-1) ?? '';
                    description = loadedCharacter.description;
                    shapes = loadedCharacter.shapes;
                    isPublic = loadedCharacter.public;
                    collaborators = loadedCharacter.collaborators;
                }
            });
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

    function isValidName(name: string) {
        return name.length >= 1 &&
            toTokens(name).nextAre(Sym.Name, Sym.End) &&
            ConceptLink.parse(name) instanceof CharacterName
            ? true
            : $locales.get((l) => l.ui.page.character.feedback.name);
    }

    function isValidDescription(description: string) {
        return description.length > 0
            ? true
            : $locales.get((l) => l.ui.page.character.feedback.description);
    }

    /** Centralized shape list updating to support undo/redo. */
    function setShapes(newShapes: CharacterShape[]) {
        // Remove the future if we're in the past
        if (historyIndex < history.length - 1)
            history = history.slice(0, historyIndex);

        // Update the shapes.
        shapes = newShapes;

        // Remove any selection that's no longer in the shapes.
        selection = selection.filter((s) => shapes.includes(s));

        // Clone the current shapes and add them to the history the shapes to the history
        history = [
            ...history,
            structuredClone($state.snapshot(shapes)) as CharacterShape[],
        ];

        // Move the index to the present.
        historyIndex = history.length;

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
            center: { x: drawingCursorPosition.x, y: drawingCursorPosition.y },
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
                        s.center.x !== drawingCursorPosition.x ||
                        s.center.y !== drawingCursorPosition.y,
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
                center: {
                    x: drawingCursorPosition.x,
                    y: drawingCursorPosition.y,
                },
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
            Math.abs(drawingCursorPosition.x - pendingRectOrEllipse.center.x) *
                2,
        );
        pendingRectOrEllipse.height = Math.max(
            1,
            Math.abs(drawingCursorPosition.y - pendingRectOrEllipse.center.y) *
                2,
        );
    }

    function getCurrentEllipse(): CharacterEllipse {
        return {
            ...{
                type: 'ellipse',
                center: {
                    x: drawingCursorPosition.x,
                    y: drawingCursorPosition.y,
                },
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
            points: [
                { x: drawingCursorPosition.x, y: drawingCursorPosition.y },
            ],
            closed: currentClosed,
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
            last.x !== drawingCursorPosition.x ||
            last.y !== drawingCursorPosition.y
        )
            pendingPath.points.push({
                x: drawingCursorPosition.x,
                y: drawingCursorPosition.y,
            });
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
            copyShapes();
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        // Handle paste
        if (event.key === 'v' && event.metaKey) {
            pasteShapes();
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        // Handle select all
        if (event.key === 'a' && event.metaKey) {
            selectAll();
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
                        endPath();
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

    function selectAll() {
        selection = [...shapes];
    }

    function copyShapes() {
        copy = selection.map(
            (s) => structuredClone($state.snapshot(s)) as CharacterShape,
        );
    }

    function pasteShapes() {
        if (copy) {
            const copies = copy.map(
                (s) => structuredClone($state.snapshot(s)) as CharacterShape,
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
    }

    function endPath() {
        if (pendingPath) {
            if (pendingPath.points.length < 2) {
                setShapes(shapes.filter((s) => s !== pendingPath));
                pendingPath = undefined;
            } else {
                selection = [pendingPath];
                pendingPath = undefined;
                // Mark history
                setShapes([...shapes]);
                mode = DrawingMode.Select;
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
            selection = [];
            setPixel();
            if (canvasView) setKeyboardFocus(canvasView, 'Focus the canvas.');
            return;
        }
        // In rectangle mode? Start or update a rectangle.
        else if (mode === DrawingMode.Rect || mode === DrawingMode.Ellipse) {
            // If there's no pending rect, start one at the current position.
            if (pendingRectOrEllipse === undefined) {
                selection = [];
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
                selection = [];
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
                firstDrag = true;
                for (const shape of selection) {
                    switch (shape.type) {
                        // These three are easy.
                        case 'rect':
                        case 'ellipse':
                        case 'pixel':
                            dragOffsets.push({
                                x: x - shape.center.x,
                                y: y - shape.center.y,
                            });
                        case 'path':
                            if (shape.type === 'path') {
                                const center = getPathCenter(shape);
                                dragOffsets.push({
                                    x: x - center.x,
                                    y: y - center.y,
                                });
                            }
                    }
                }
            }
            // Are we moving? Move the selection, accounting for the shape's offsets.
            else {
                if (move && firstDrag) {
                    // Just starting a drag? Remember the current positions in the history so we can undo to before the drag.
                    setShapes([...shapes]);
                    firstDrag = false;
                }

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
        if (dragOffsets) {
            dragOffsets = undefined;
            firstDrag = false;
        }

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

    function arrange(direction: 'back' | 'toBack' | 'forward' | 'toFront') {
        // Move each shape forward or backward in the shape list.
        for (const shape of selection.toReversed()) {
            const currentIndex = shapes.findIndex((s) => s === shape);
            const newIndex =
                direction === 'toBack'
                    ? 0
                    : direction === 'toFront'
                      ? shapes.length - 1
                      : direction === 'back'
                        ? currentIndex - 1
                        : currentIndex + 1;
            if (newIndex >= 0 && newIndex < shapes.length) {
                const newShapes = [...shapes];
                newShapes.splice(currentIndex, 1);
                newShapes.splice(newIndex, 0, shape);
                setShapes([...newShapes]);
            }
        }
    }

    function flip(direction: 'horizontal' | 'vertical') {
        for (const shape of selection) {
            if (shape.type === 'path') {
                const center = getPathCenter(shape);
                for (const point of shape.points) {
                    if (direction === 'horizontal') {
                        point.x = center.x - (point.x - center.x);
                    } else {
                        point.y = center.y - (point.y - center.y);
                    }
                }
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
            palette={colors}
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

{#snippet sizeSlider(width: boolean)}
    <Slider
        label={width
            ? $locales.get((l) => l.ui.page.character.field.width.label)
            : $locales.get((l) => l.ui.page.character.field.height.label)}
        tip={width
            ? $locales.get((l) => l.ui.page.character.field.width.tip)
            : $locales.get((l) => l.ui.page.character.field.height.tip)}
        min={1}
        max={CharacterSize}
        increment={1}
        precision={1}
        unit={''}
        bind:value={() => {
            const widths = [
                ...new Set(
                    selection
                        .filter(
                            (s) => s.type === 'rect' || s.type === 'ellipse',
                        )
                        .map((s) => (width ? s.width : s.height)),
                ),
            ];
            return widths[0];
        },
        (val) => {
            for (const shape of selection)
                if (shape.type === 'rect' || shape.type === 'ellipse')
                    if (width) shape.width = val;
                    else shape.height = val;
        }}
        release={() => setShapes([...shapes])}
    ></Slider>
{/snippet}

<!-- The palette -->
{#snippet palette()}
    <div class="palette">
        <h2>{$locales.get((l) => l.ui.page.character.field.mode).label}</h2>
        <Mode
            descriptions={$locales.get((l) => l.ui.page.character.field.mode)}
            modes={['👆', '■', '🔲', '⚪️', '╱']}
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

        <MarkupHtmlView
            markup={mode === DrawingMode.Select && shapes.length === 0
                ? $locales.get((l) => l.ui.page.character.instructions.empty)
                : mode === DrawingMode.Select &&
                    shapes.length > 0 &&
                    selection.length === 0
                  ? $locales.get(
                        (l) => l.ui.page.character.instructions.unselected,
                    )
                  : mode === DrawingMode.Select &&
                      shapes.length > 0 &&
                      selection.length > 0
                    ? $locales.get(
                          (l) => l.ui.page.character.instructions.selected,
                      )
                    : mode === DrawingMode.Pixel
                      ? $locales.get(
                            (l) => l.ui.page.character.instructions.pixel,
                        )
                      : mode === DrawingMode.Rect
                        ? $locales.get(
                              (l) => l.ui.page.character.instructions.rect,
                          )
                        : mode === DrawingMode.Ellipse
                          ? $locales.get(
                                (l) => l.ui.page.character.instructions.ellipse,
                            )
                          : $locales.get(
                                (l) => l.ui.page.character.instructions.path,
                            )}
        ></MarkupHtmlView>

        {#if mode !== DrawingMode.Select || selection.length > 0}
            {@const selectedFillStates = Array.from(
                new Set(
                    selection.map((s) =>
                        'fill' in s
                            ? s.fill === null
                                ? 'inherit'
                                : 'set'
                            : 'none',
                    ),
                ),
            )}
            <!-- All shapes have fills -->
            {@render colorChooser(
                $locales,
                selectedFillStates.length === 1
                    ? selectedFillStates[0]
                    : currentFillSetting,
                // If there's a selection that all has the same color, show the color, otherwise show the current fill color.
                getSharedColor(selection.map((s) => s.fill)) ?? currentFill,
                mode !== DrawingMode.Pixel && currentStrokeSetting !== 'none',
                (l) => l.ui.page.character.field.fill,
                (choice) => {
                    currentFillSetting = choice;
                    const fill = getCurrentFill();
                    for (const shape of selection) {
                        if (fill) shape.fill = fill;
                        else delete shape.fill;
                    }
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
                {@const selectedStrokeColors = Array.from(
                    new Set(
                        selection.map((s) =>
                            'stroke' in s
                                ? s.stroke === null
                                    ? 'inherit'
                                    : 'set'
                                : 'none',
                        ),
                    ),
                )}

                {@render colorChooser(
                    $locales,
                    // The current color setting for the stroke should be be based on the selection, if all items have the same setting
                    selectedStrokeColors.length === 1
                        ? selectedStrokeColors[0]
                        : currentStrokeSetting,
                    // If there's a selection that all has the same color, show the color, otherwise show the current fill color.
                    getSharedColor(
                        selection
                            .filter((s) => s.type !== 'pixel')
                            .map((s) => s.stroke?.color),
                    ) ?? currentStroke,
                    currentFillSetting !== 'none',
                    (l) => l.ui.page.character.field.stroke,
                    (choice) => {
                        currentStrokeSetting = choice;
                        if (selection.length > 0) {
                            const newStroke = getCurrentStroke();
                            for (const shape of selection)
                                if (shape.type !== 'pixel') {
                                    if (newStroke) shape.stroke = newStroke;
                                    else delete shape.stroke;
                                }
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
                    min={0.5}
                    max={3}
                    increment={0.25}
                    precision={2}
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
            <!-- Only rects and radii have a width and height -->
            {#if selection.every((s) => s.type === 'rect' || s.type === 'ellipse')}
                {@render sizeSlider(true)}
                {@render sizeSlider(false)}
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
                <Button
                    tip={$locales.get(
                        (l) => l.ui.page.character.button.horizontal.tip,
                    )}
                    action={() => flip('horizontal')}
                    active={selection.some((s) => s.type === 'path')}
                >
                    ↔
                    {$locales.get(
                        (l) => l.ui.page.character.button.horizontal.label,
                    )}
                </Button>
                <Button
                    tip={$locales.get(
                        (l) => l.ui.page.character.button.vertical.tip,
                    )}
                    action={() => flip('vertical')}
                    active={selection.some((s) => s.type === 'path')}
                >
                    ↕
                    {$locales.get(
                        (l) => l.ui.page.character.button.vertical.label,
                    )}
                </Button>
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
                            } else currentClosed = on;
                        }}
                        label={$locales.get(
                            (l) => l.ui.page.character.field.closed,
                        )}
                    ></Checkbox>{$locales.get(
                        (l) => l.ui.page.character.field.closed,
                    )}
                </label>
            {/if}
        {/if}
    </div>

    <style>
        .palette {
            min-width: 10em;
            width: 40vw;
            display: flex;
            flex-direction: column;
            gap: calc(2 * var(--wordplay-spacing));
        }

        label {
            display: flex;
            flex-direction: row;
            align-items: baseline;
        }

        p {
            margin: 0;
        }
    </style>
{/snippet}

{#snippet toolbar()}
    <div class="toolbar">
        <Button
            tip={$locales.get((l) => l.ui.page.character.button.undo.tip)}
            action={() => undo()}
            active={historyIndex > 0}
        >
            {UNDO_SYMBOL}
            {$locales.get((l) => l.ui.page.character.button.undo.label)}
        </Button>
        <Button
            tip={$locales.get((l) => l.ui.page.character.button.redo.tip)}
            action={() => redo()}
            active={historyIndex < history.length - 1}
        >
            {REDO_SYMBOL}
            {$locales.get((l) => l.ui.page.character.button.redo.label)}
        </Button>
        <Button
            tip={$locales.get((l) => l.ui.page.character.button.all.tip)}
            action={() => selectAll()}
            active={shapes.length > 0}
        >
            {ALL_SYMBOL}
            {$locales.get((l) => l.ui.page.character.button.all.label)}
        </Button>
        <Button
            tip={$locales.get((l) => l.ui.page.character.button.toBack.tip)}
            action={() => arrange('toBack')}
            active={selection.length > 0 && shapes.length > 1}
            >⇡
            {$locales.get(
                (l) => l.ui.page.character.button.toBack.label,
            )}</Button
        >
        <Button
            tip={$locales.get((l) => l.ui.page.character.button.back.tip)}
            action={() => arrange('back')}
            active={selection.length > 0 && shapes.length > 1}
            >{SHARE_SYMBOL}
            {$locales.get((l) => l.ui.page.character.button.back.label)}</Button
        >
        <Button
            tip={$locales.get((l) => l.ui.page.character.button.forward.tip)}
            action={() => arrange('forward')}
            active={selection.length > 0 && shapes.length > 1}
            >{BORROW_SYMBOL}
            {$locales.get(
                (l) => l.ui.page.character.button.forward.label,
            )}</Button
        >
        <Button
            tip={$locales.get((l) => l.ui.page.character.button.toFront.tip)}
            action={() => arrange('toFront')}
            active={selection.length > 0 && shapes.length > 1}
            >⇡
            {$locales.get(
                (l) => l.ui.page.character.button.toFront.label,
            )}</Button
        >
        <Button
            tip={$locales.get((l) => l.ui.page.character.button.copy.tip)}
            action={copyShapes}
            active={selection.length > 0}
            >{COPY_SYMBOL}
            {$locales.get((l) => l.ui.page.character.button.copy.label)}</Button
        >
        <Button
            tip={$locales.get((l) => l.ui.page.character.button.paste.tip)}
            action={pasteShapes}
            active={copy !== undefined}
            >{PASTE_SYMBOL}
            {$locales.get(
                (l) => l.ui.page.character.button.paste.label,
            )}</Button
        >
        <Button
            tip={$locales.get(
                (l) => l.ui.page.character.button.clearPixels.tip,
            )}
            action={() => {
                setShapes(shapes.filter((s) => s.type !== 'pixel'));
            }}
            active={shapes.some((s) => s.type === 'pixel')}
            >{ERASE_SYMBOL}
            {$locales.get(
                (l) => l.ui.page.character.button.clearPixels.label,
            )}</Button
        >
        <Button
            tip={$locales.get((l) => l.ui.page.character.button.clear.tip)}
            action={() => {
                setShapes([]);
            }}
            active={shapes.length > 0}
            >{ERASE_SYMBOL}
            {$locales.get(
                (l) => l.ui.page.character.button.clear.label,
            )}</Button
        >
    </div>

    <style>
        .toolbar {
            display: flex;
            flex-direction: column;
            flex-wrap: wrap;
            row-gap: var(--wordplay-spacing);
            align-items: end;
        }
    </style>
{/snippet}

<Page>
    <section>
        <div class="header">
            <Header block={false}
                >{$locales.get((l) => l.ui.page.character.header)}</Header
            >
            <p>{$locales.get((l) => l.ui.page.character.prompt)}</p>
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
            <div class="meta">
                <div class="preview">
                    {#if editedCharacter}
                        {@html characterToSVG(editedCharacter, '32px')}
                    {/if}
                </div>
                <h1 style:z-index="2" style:margin="0">
                    <TextField
                        id="character-name"
                        bind:text={name}
                        placeholder={$locales.get(
                            (l) => l.ui.page.character.field.name.placeholder,
                        )}
                        description={$locales.get(
                            (l) => l.ui.page.character.field.name.description,
                        )}
                        validator={isValidName}
                    ></TextField>
                </h1>
                <RootView
                    node={toProgram(
                        `${Basis.getLocalizedBasis($locales).shares.output.Phrase.names.getNames()[0]}(\`@${Creator.getUsername($user.email ?? '')}/${name}\`)`,
                    )}
                    blocks={false}
                />
                <TextField
                    id="character-description"
                    bind:text={description}
                    placeholder={$locales.get(
                        (l) =>
                            l.ui.page.character.field.description.placeholder,
                    )}
                    description={$locales.get(
                        (l) =>
                            l.ui.page.character.field.description.description,
                    )}
                    validator={isValidDescription}
                ></TextField>
                <Dialog
                    description={$locales.get(
                        (l) => l.ui.page.character.share.dialog,
                    )}
                    button={{
                        tip: $locales.get(
                            (l) => l.ui.page.character.share.button.tip,
                        ),
                        icon: isPublic ? GLOBE1_SYMBOL : '🤫',
                        label: isPublic
                            ? $locales.get(
                                  (l) =>
                                      l.ui.page.character.share.public.modes[0],
                              )
                            : $locales.get(
                                  (l) =>
                                      l.ui.page.character.share.public.modes[1],
                              ),
                    }}
                >
                    <Mode
                        descriptions={$locales.get(
                            (l) => l.ui.page.character.share.public,
                        )}
                        choice={isPublic ? 0 : 1}
                        select={(mode) => (isPublic = mode === 0)}
                        modes={[
                            '🤫 ' +
                                $locales.get(
                                    (l) =>
                                        l.ui.page.character.share.public
                                            .modes[0],
                                ),
                            `${GLOBE1_SYMBOL} ${$locales.get((l) => l.ui.page.character.share.public.modes[1])}`,
                        ]}
                    />
                    {#if !isPublic}
                        <Labeled
                            label={$locales.get(
                                (l) => l.ui.page.character.share.collaborators,
                            )}
                        >
                            <CreatorList
                                uids={collaborators}
                                editable={!isPublic}
                                anonymize={false}
                                add={(userID) =>
                                    (collaborators = [
                                        ...collaborators,
                                        userID,
                                    ])}
                                remove={(userID) =>
                                    (collaborators = collaborators.filter(
                                        (c) => c !== userID,
                                    ))}
                                removable={() => true}
                            />
                        </Labeled>
                    {/if}
                </Dialog>
                {#if $user !== null && editedCharacter !== null && $user.uid === editedCharacter.owner}
                    <ConfirmButton
                        tip={$locales.get(
                            (l) => l.ui.page.character.share.delete.tip,
                        )}
                        action={() => {
                            if (editedCharacter) {
                                CharactersDB.deleteCharacter(
                                    editedCharacter.id,
                                );
                                goto('/characters');
                            }
                        }}
                        prompt={$locales.get(
                            (l) => l.ui.page.character.share.delete.tip,
                        )}
                        enabled={editedCharacter !== null}
                        >{CANCEL_SYMBOL}
                        {$locales.get(
                            (l) => l.ui.page.character.share.delete.label,
                        )}</ConfirmButton
                    >
                {/if}
            </div>
            {#if !nameAvailable}
                <Feedback
                    >{$locales.get(
                        (l) => l.ui.page.character.feedback.taken,
                    )}</Feedback
                >
            {:else if !savable}
                <Feedback
                    >{$locales.get(
                        (l) => l.ui.page.character.feedback.unsaved,
                    )}</Feedback
                >
            {/if}

            <div class="editor">
                {@render toolbar()}
                <div class="content">
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
                        {#if editedCharacter}
                            {@html characterToSVG(
                                editedCharacter,
                                '100%',
                                selection,
                            )}
                        {/if}
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
                    </div>
                    {#if pendingPath}
                        <div class="notes">
                            <Feedback>
                                <Button
                                    background
                                    tip={$locales.get(
                                        (l) =>
                                            l.ui.page.character.button.end.tip,
                                    )}
                                    action={endPath}
                                    active={pendingPath !== undefined}
                                    >🛑
                                    {$locales.get(
                                        (l) =>
                                            l.ui.page.character.button.end
                                                .label,
                                    )}</Button
                                >
                                {$locales.get(
                                    (l) => l.ui.page.character.feedback.end,
                                )}</Feedback
                            >
                        </div>
                    {/if}
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
        gap: 1em;
        align-items: center;
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
        position: relative;
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

    .row {
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing);
        align-items: center;
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

    .select {
        cursor: default;
    }

    .meta {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
        align-items: center;
        border-bottom: var(--wordplay-border-color) solid
            var(--wordplay-border-width);
        padding-bottom: var(--wordplay-spacing);
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
        z-index: 2;
    }
</style>
