<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { Basis } from '@basis/Basis';
    import Header from '@components/app/Header.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Page from '@components/app/Page.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import { getAnnounce, getUser } from '@components/project/Contexts';
    import CreatorList from '@components/project/CreatorList.svelte';
    import RootView from '@components/project/RootView.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import Button from '@components/widgets/Button.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import ColorChooser from '@components/widgets/ColorChooser.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import EmojiChooser from '@components/widgets/EmojiChooser.svelte';
    import Labeled from '@components/widgets/Labeled.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Slider from '@components/widgets/Slider.svelte';
    import TextBox from '@components/widgets/TextBox.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Title from '@components/widgets/Title.svelte';
    import { Creator } from '@db/creators/CreatorDatabase';
    import { CharactersDB, locales } from '@db/Database';
    import Locales from '@locale/Locales';
    import type LocaleText from '@locale/LocaleText';
    import { type ModeText } from '@locale/UITexts';
    import ConceptLink, { CharacterName } from '@nodes/ConceptLink';
    import Sym from '@nodes/Sym';
    import { toProgram } from '@parser/parseProgram';
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
    import { toTokens } from '@parser/toTokens';
    import ColorJS from 'colorjs.io';
    import { untrack } from 'svelte';
    import {
        CharacterSize,
        characterToSVG,
        getPathCenter,
        getSharedColor,
        moveShape,
        pixelsAreEqual,
        type Character,
        type CharacterEllipse,
        type CharacterPath,
        type CharacterPixel,
        type CharacterRectangle,
        type CharacterShape,
        type Point,
    } from '../../../db/characters/Character';
    import UnicodeString from '../../../unicode/UnicodeString';

    // svelte-ignore non_reactive_update
    enum DrawingMode {
        Select,
        Eraser,
        Pixel,
        Rect,
        Ellipse,
        Path,
        Emoji,
    }

    type ColorSetting = 'none' | 'inherit' | 'set';
    type LCH = { l: number; c: number; h: number };

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
    let history: CharacterShape[][] = $state.raw([]);

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

    /** The last pixel drawn while dragging, so we can fill in pixels between them with interpolation. */
    let lastPixel = $state<CharacterPixel | undefined>(undefined);

    /** The HTML element of the canvas */
    let canvasView: HTMLDivElement | null = $state(null);

    /** Pixels drawn or erased in a stroke */
    let strokePixels = $state(0);

    /** Whether we moved shapes */
    let moved = $state(false);

    /** The pixel replaced by a set pixel, in case we double click fill */
    let replacedPixel: CharacterPixel | undefined = $state(undefined);

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

    let nameAvailable = $derived.by(() => {
        const c = CharactersDB.getEditableCharacterWithName(name);
        return (
            c === undefined ||
            (editedCharacter !== null && c.id === editedCharacter.id)
        );
    });

    /** Always have an up to date character to render and save */
    let editedCharacter: Character | null = $derived(
        $user === null || $user.email === null || typeof persisted === 'string'
            ? null
            : {
                  ...persisted,
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

    let savable = $derived(
        $user !== null &&
            $user.email !== null &&
            isValidName(name) === true &&
            nameAvailable &&
            isValidDescription(description) === true,
    );

    let saving: number | undefined = undefined;
    function save() {
        // Not loaded yet? Don't save.
        if (typeof persisted === 'string') return;
        // Not changed? Don't save.
        // Not a valid name or description? Don't save.
        if (!savable) return;

        saving = Date.now();

        // Get the raw, non-proxied value.
        const raw = $state.snapshot(editedCharacter) as Character;

        // Remove any undefined fields that accidentally slipped in due to optional properties in Zod permitting undefined values.
        const removeEmpty = (obj: Record<any, any>) => {
            let newObj: Record<any, any> = {};
            Object.keys(obj).forEach((key) => {
                if (obj[key] === Object(obj[key]))
                    newObj[key] = removeEmpty(obj[key]);
                else if (obj[key] !== undefined) newObj[key] = obj[key];
            });
            return newObj;
        };
        removeEmpty(raw);

        // Save the character.
        CharactersDB.updateCharacter(
            {
                ...raw,
                updated: saving,
            },
            true,
        );
    }

    /**
     * When the edited character changes and we have loaded the persisted one,
     * tell the database about the new value.
     * */
    $effect(() => {
        if (savable && editedCharacter !== null) untrack(() => save());
    });

    /** When the page loads or its id changes or the local store of characters changes, load the persisted character */
    $effect(() => {
        // We get this first so there's a dependency on it.
        const charPromise = CharactersDB.getByID(page.params.id);

        if (saving !== undefined) {
            saving = undefined;
            return;
        }

        if ($user) {
            charPromise.then((loadedCharacter) => {
                // If we loaded the character and it's different from the edited character, update the states.
                if (loadedCharacter) {
                    name = loadedCharacter.name.split('/').at(-1) ?? '';
                    description = loadedCharacter.description;
                    shapes = loadedCharacter.shapes;
                    isPublic = loadedCharacter.public;
                    collaborators = loadedCharacter.collaborators;

                    // Start history with the loaded shapes.
                    history = [structuredClone(loadedCharacter.shapes)];
                    historyIndex = 0;

                    persisted = loadedCharacter;
                    loadedCharacter === undefined
                        ? 'failed'
                        : loadedCharacter === null
                          ? 'unknown'
                          : loadedCharacter;
                } else {
                    persisted =
                        loadedCharacter === undefined
                            ? 'failed'
                            : loadedCharacter === null
                              ? 'unknown'
                              : 'unknown';
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
            : (l: LocaleText) => l.ui.page.character.feedback.name;
    }

    function isValidDescription(description: string) {
        return description.length > 0
            ? true
            : (l: LocaleText) => l.ui.page.character.feedback.description;
    }

    /** Remember the current state */
    function rememberShapes() {
        setShapes([...shapes], true);
    }

    /** Centralized shape list updating to support undo/redo. */
    function setShapes(newShapes: CharacterShape[], remember = true) {
        // Extra careful in case shapes is somehow set to undefined.
        if (newShapes === undefined) {
            console.error('Somehow, new shapes were sent as undefined');
            console.trace();
            return;
        }

        // Remove the future if we're in the past
        if (historyIndex < history.length - 1)
            history = history.slice(0, historyIndex + 1);

        // Remove any selection that's no longer in the shapes.
        selection = selection.filter((s) => shapes.includes(s));

        // Clone the current shapes and add them to the history the shapes to the history
        if (remember) {
            history = [
                ...history,
                structuredClone($state.snapshot(shapes)) as CharacterShape[],
            ];
        }

        // Update the shapes.
        shapes = newShapes;

        // Move the index to the present.
        historyIndex = history.length - 1;

        // No more than 250 steps back, just to be conservative about memory.
        if (history.length > 250) {
            history.shift();
        }
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            const previousShapes = history[historyIndex];
            if (previousShapes) shapes = previousShapes;
        }
    }

    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            const futureShapes = history[historyIndex];
            if (futureShapes) shapes = futureShapes;
        }
    }

    /** Set the pixel at the current position and fill. */
    function setPixel(
        remember = true,
        x?: number | undefined,
        y?: number | undefined,
        color?: LCH,
    ): CharacterPixel | undefined {
        x = x ?? drawingCursorPosition.x;
        y = y ?? drawingCursorPosition.y;

        const candidate: CharacterPixel = {
            type: 'pixel',
            point: { x, y },
            fill: { ...(color ?? currentFill) },
        };
        const match = shapes
            // Remove pixels at the same position
            .find((s) => s.type === 'pixel' && pixelsAreEqual(s, candidate));

        const pixelAtPosition = shapes.find(
            (s): s is CharacterPixel =>
                s.type === 'pixel' && s.point.x === x && s.point.y === y,
        );

        // Already an identical pixel? Do nothing.
        if (match) return undefined;

        // Remember the replaced pixel so we can can fill if there's a later double click.
        replacedPixel = pixelAtPosition;

        setShapes(
            [
                ...shapes
                    // Remove pixels at the same position
                    .filter(
                        (s) =>
                            s.type !== 'pixel' ||
                            s.point.x !== x ||
                            s.point.y !== y,
                    ),
                // Add the new pixel.
                candidate,
            ],
            remember,
        );

        return candidate;
    }

    function erasePixel(remember = true) {
        const removed = shapes.filter(
            (s) =>
                s.type !== 'pixel' ||
                s.point.x !== drawingCursorPosition.x ||
                s.point.y !== drawingCursorPosition.y,
        );
        if (removed.length === shapes.length) return false;
        setShapes(removed, remember);
        return true;
    }

    /** Null if inherented, undefined if none, or the current fill color if set */
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
                point: {
                    x: drawingCursorPosition.x,
                    y: drawingCursorPosition.y,
                },
                width: 1,
                height: 1,
            },
            ...(getCurrentFill() && { fill: getCurrentFill() }),
            ...(getCurrentStroke() && { stroke: getCurrentStroke() }),
            ...(currentCorner !== 1 && { corner: currentCorner }),
            ...(currentAngle !== 0 && { angle: currentAngle }),
        };
    }

    function updatePendingRect() {
        if (pendingRectOrEllipse === undefined) return;
        // Update the pending rect's dimensions to the current pointer position.
        pendingRectOrEllipse.width =
            drawingCursorPosition.x - pendingRectOrEllipse.point.x;
        pendingRectOrEllipse.height =
            drawingCursorPosition.y - pendingRectOrEllipse.point.y;
    }

    function updatePendingEllipse() {
        if (pendingRectOrEllipse === undefined) return;
        // Update the pending rect's dimensions to the current pointer position.
        pendingRectOrEllipse.width =
            drawingCursorPosition.x - pendingRectOrEllipse.point.x;
        pendingRectOrEllipse.height =
            drawingCursorPosition.y - pendingRectOrEllipse.point.y;
    }

    function getCurrentEllipse(): CharacterEllipse {
        return {
            ...{
                type: 'ellipse',
                point: {
                    x: drawingCursorPosition.x,
                    y: drawingCursorPosition.y,
                },
                width: 1,
                height: 1,
            },
            ...(getCurrentFill() && {
                fill: getCurrentFill(),
            }),
            ...(getCurrentStroke() && {
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
            ...(getCurrentFill() && {
                fill: getCurrentFill(),
            }),
            ...(getCurrentStroke() && {
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
            last === undefined ||
            last.x !== drawingCursorPosition.x ||
            last.y !== drawingCursorPosition.y
        )
            pendingPath.points.push({
                x: drawingCursorPosition.x,
                y: drawingCursorPosition.y,
            });
    }

    function addShapes(
        newShapes: CharacterShape | CharacterShape[],
        remember = true,
    ) {
        setShapes(
            [
                ...shapes,
                ...(Array.isArray(newShapes) ? newShapes : [newShapes]),
            ],
            remember,
        );
    }

    function handleArrow(dx: -1 | 0 | 1, dy: -1 | 0 | 1) {
        // Selection? Move the selection in the preferred direction.
        if (selection.length > 0) {
            for (const shape of selection)
                moveShape(shape, dx, dy, 'translate');
            rememberShapes();
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
                    const first = shapes[0];
                    if (first) selection = [first];
                }
                // Otherwise, move the selection based on the arrow key.
                else {
                    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                        const first = selection[0];
                        if (first) {
                            const index = shapes.indexOf(first);
                            if (index >= 0 && index < shapes.length) {
                                const previous =
                                    shapes[
                                        index === 0
                                            ? shapes.length - 1
                                            : index - 1
                                    ];
                                if (previous) selection = [previous];
                            }
                        }
                    } else if (
                        event.key === 'ArrowDown' ||
                        event.key === 'ArrowRight'
                    ) {
                        const first = selection[0];
                        if (first) {
                            const index = shapes.indexOf(first);
                            if (index >= 0 && index < shapes.length) {
                                const next =
                                    shapes[
                                        index === shapes.length - 1
                                            ? 0
                                            : index + 1
                                    ];
                                if (next) selection = [next];
                            }
                        }
                    }
                }
            } else {
                if (event.key === 'ArrowUp') handleArrow(0, -1);
                else if (event.key === 'ArrowDown') handleArrow(0, 1);
                else if (event.key === 'ArrowLeft') handleArrow(-1, 0);
                else if (event.key === 'ArrowRight') handleArrow(1, 0);
                // Pending shape? Update it based on the new position.
                if (pendingRectOrEllipse) {
                    if (pendingRectOrEllipse.type === 'rect')
                        updatePendingRect();
                    else updatePendingEllipse();
                }
            }
            // Swallow the arrow event
            event.stopPropagation();
            event.preventDefault();
        }

        const control = event.ctrlKey || event.metaKey;

        // Handle undo/redo
        if (event.key === 'z' && control) {
            if (event.shiftKey) redo();
            else undo();
            event.stopPropagation();
            event.preventDefault();
            return;
        }
        if (event.key === 'y' && control) {
            redo();
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        // Handle copy
        if (event.key === 'c' && control && selection.length > 0) {
            copyShapes();
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        // Handle paste
        if (event.key === 'v' && control) {
            pasteShapes();
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        // Handle undo
        if (event.key === 'z' && control) {
            if (event.shiftKey) redo();
            else undo();
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        // Handle redo
        if (event.key === 'y' && control) {
            undo();
            event.stopPropagation();
            event.preventDefault();
            return;
        }

        // Handle select all
        if (event.key === 'a' && control) {
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
        // If in eraser mode, delete a pixel, if there is one.
        else if (mode === DrawingMode.Eraser && action) {
            erasePixel();
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
                addShapes(pendingRectOrEllipse, false);
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
                    addShapes(pendingPath, false);
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
                rememberShapes();
                mode = DrawingMode.Select;
            }
        }
    }

    function getShapeUnderPointer(event: PointerEvent): CharacterShape | null {
        const candidate = document.elementFromPoint(
            event.clientX,
            event.clientY,
        );
        if (candidate instanceof SVGElement) {
            const svg = candidate.parentElement;
            if (svg !== null && svg.parentElement === canvasView) {
                const index = Array.from(svg.childNodes).indexOf(candidate);
                if (index >= 0 && index < shapes.length) {
                    const selected = shapes[index];
                    return selected ?? null;
                }
            }
        }
        return null;
    }

    /** Try to fill pixels between the two given points, to allow for strokes without gaps */
    function interpolate(startPixel: CharacterPixel, endPixel: CharacterPixel) {
        const start = startPixel.point;
        const end = endPixel.point;

        // If the manhattan distance is > 2, fill the gap. Otherwise, it's probably not necessary.
        if (Math.abs(start.x - end.x) + Math.abs(start.y - end.y) >= 2) {
            // Linear interpolation between two points.
            let slope =
                start.x === end.x
                    ? Infinity
                    : (end.y - start.y) / (end.x - start.x);
            const newPixels: CharacterPixel[] = [];
            if (slope === Infinity) {
                for (
                    let y = Math.min(start.y, end.y);
                    y <= Math.max(start.y, end.y);
                    y++
                ) {
                    newPixels.push({
                        type: 'pixel',
                        point: { x: start.x, y },
                        fill: startPixel.fill,
                    });
                }
            } else {
                // Iterate through the x positions and calculate the y position based on the slope.
                for (
                    let x = start.x;
                    x !== end.x;
                    x += start.x < end.x ? 1 : -1
                ) {
                    const y = Math.round(slope * (x - start.x) + start.y);
                    newPixels.push({
                        type: 'pixel',
                        point: { x, y },
                        fill: startPixel.fill,
                    });
                }
            }
            const nonRedundantPixels = newPixels.filter(
                (p) =>
                    !shapes.some(
                        (s) => s.type === 'pixel' && pixelsAreEqual(s, p),
                    ),
            );
            if (nonRedundantPixels.length > 0)
                setShapes([...shapes, ...nonRedundantPixels], false);
        }
    }

    function handlePointerDown(event: PointerEvent, move: boolean) {
        if (!(event.currentTarget instanceof HTMLElement)) return;

        if (!move && canvasView) {
            setKeyboardFocus(canvasView, 'Focus the canvas.');
            event.preventDefault();
        }

        // Get the current canvas position.
        const x = Math.min(
            CharacterSize - 1,
            Math.max(
                0,
                Math.floor(
                    (event.offsetX / event.currentTarget.clientWidth) *
                        CharacterSize,
                ),
            ),
        );
        const y = Math.min(
            CharacterSize - 1,
            Math.max(
                0,
                Math.floor(
                    (event.offsetY / event.currentTarget.clientHeight) *
                        CharacterSize,
                ),
            ),
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
            const newPixel = setPixel(false);
            if (newPixel) {
                lastPixel = newPixel;
                strokePixels = 1;
            }

            if (move) {
                // If we're dragging and there's a last pixel, draw pixels between them.
                if (lastPixel !== undefined && newPixel !== undefined) {
                    interpolate($state.snapshot(lastPixel), newPixel);
                    strokePixels++;
                }
                if (newPixel !== undefined) lastPixel = newPixel;
            }

            if (canvasView) setKeyboardFocus(canvasView, 'Focus the canvas.');
            return;
        } else if (mode === DrawingMode.Eraser) {
            selection = [];
            // If not moving, see what shape is under the pointer and delete it.
            if (!move) {
                strokePixels = 0;
                const under = getShapeUnderPointer(event);
                if (under !== null) {
                    const removed = shapes.filter((s) => s !== under);
                    if (removed.length !== shapes.length) {
                        strokePixels++;
                        setShapes(removed);
                    }
                }
            } else {
                if (erasePixel(false)) strokePixels++;
            }
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
                addShapes(pendingRectOrEllipse, false);
            } else {
                if (pendingRectOrEllipse.type === 'rect') updatePendingRect();
                else updatePendingEllipse();
            }
            return;
        } else if (mode === DrawingMode.Path && !move) {
            if (pendingPath === undefined) {
                selection = [];
                pendingPath = getCurrentPath();
                addShapes(pendingPath, false);
            } else updatePendingPath();

            return;
        } else if (mode === DrawingMode.Select) {
            if (!move) {
                const under = getShapeUnderPointer(event);
                if (under !== null) {
                    if (!selection.includes(under)) {
                        if (event.shiftKey) selection = [...selection, under];
                        else selection = [under];
                    }
                } else selection = [];

                // Reset the moved tracker.
                moved = false;
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
                                x: x - shape.point.x,
                                y: y - shape.point.y,
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
                    firstDrag = false;
                }

                if (selection.length > 0) {
                    moved = true;
                    for (const [index, shape] of selection.entries()) {
                        const offset = dragOffsets[index];
                        if (offset)
                            moveShape(
                                shape,
                                x - offset.x,
                                y - offset.y,
                                'move',
                            );
                    }
                }
            }
        }
    }

    function handlePointerUp(event: PointerEvent) {
        if (dragOffsets && mode === DrawingMode.Select) {
            dragOffsets = undefined;
            firstDrag = false;
            if (moved) rememberShapes();
            moved = false;
        }
        // Done? Reset the pending shapes to nothing.
        else if (pendingRectOrEllipse) {
            selection = [pendingRectOrEllipse];
            pendingRectOrEllipse = undefined;
            mode = DrawingMode.Select;
            event.stopPropagation();
            // Snapshot for history.
            rememberShapes();
        }
        // Done drawing or erasing pixels? Remember the current shapes.
        else if (mode === DrawingMode.Pixel || mode === DrawingMode.Eraser) {
            if (strokePixels > 0) {
                rememberShapes();
                strokePixels = 0;
            }
        }
    }

    function handleDoubleClick() {
        if (mode === DrawingMode.Path) {
            endPath();
        } else if (mode === DrawingMode.Pixel) {
            // Undo the pixel that just happened, so they're not part of the history or shapes.
            if (lastPixel) undo();
            fill(drawingCursorPosition.x, drawingCursorPosition.y);
        }
    }

    // Flood fill at the given point
    function fill(x: number, y: number, start = true) {
        // Build a hash of pixel colors for quick lookup.
        const filled: Map<string, string | undefined> = new Map();
        for (const shape of shapes) {
            if (shape.type === 'pixel')
                filled.set(
                    `${shape.point.x},${shape.point.y}`,
                    shape.fill === null
                        ? undefined
                        : `${shape.fill.l},${shape.fill.c},${shape.fill.h}`,
                );
        }

        // Get the tracking color for the current fill. This determines the boundaries.
        const currentColor =
            replacedPixel === undefined || replacedPixel.fill === null
                ? undefined
                : `${replacedPixel.fill.l},${replacedPixel.fill.c},${replacedPixel.fill.h}`;

        // Keep a stack of points visited.
        const queue: Point[] = [{ x, y }];
        const visited = new Set<string>();
        while (queue.length > 0) {
            const point = queue.shift();
            // This should never happen, but TypeScript doesn't know it.
            if (point === undefined) continue;

            // If there's already a matching point here, and we're not at the start, skip it.
            const position = `${point.x},${point.y}`;

            // Already visited this position? Quit.
            if (visited.has(position)) continue;
            visited.add(position);

            // See the current color at this position.
            let colorAtPoint = filled.get(position);
            let colorChange = colorAtPoint !== currentColor;

            // Different from the tracking color? Stop.
            if (!start && colorChange) continue;

            // Not the start anymore.
            start = false;

            const pixel: CharacterPixel = {
                type: 'pixel',
                point,
                fill: { ...currentFill },
            };
            // Remove the existing pixel here, and add the new one.
            setShapes(
                [
                    ...shapes.filter(
                        (s) =>
                            start ||
                            s.type !== 'pixel' ||
                            s.point.x !== point.x ||
                            s.point.y !== point.y,
                    ),
                    pixel,
                ],
                false,
            );

            // Remember the color we filled.
            filled.set(
                `${point.x},${point.y}`,
                `${currentFill.l},${currentFill.c},${currentFill.h}`,
            );

            // Visit the four directions.
            if (point.x > 0) queue.push({ x: point.x - 1, y: point.y });
            if (point.x < CharacterSize - 1)
                queue.push({ x: point.x + 1, y: point.y });
            if (point.y > 0) queue.push({ x: point.x, y: point.y - 1 });
            if (point.y < CharacterSize - 1)
                queue.push({ x: point.x, y: point.y + 1 });
        }
        // Add the fill to the undo history.
        rememberShapes();
    }

    /** Given an emoji, render it to a canvas, get its pixels, and place the pixels in the character's shapes. */
    function importEmoji(emoji: string) {
        // Get the
        emoji = new UnicodeString(emoji).at(0)?.toString() ?? '';
        if (emoji.length === 0) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx === null) return;
        canvas.width = 32;
        canvas.height = 32;

        document.body.appendChild(canvas); // Optional: To see the canvas

        // Draw emoji to canvas
        ctx.font = '29px "Noto Color Emoji"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(emoji, 16, 33);

        // Get image data
        const imageData = ctx.getImageData(0, 0, 32, 32);
        const pixels = imageData.data;

        // Convert pixel data to 2D array
        for (let y = 0; y < 32; y++) {
            for (let x = 0; x < 32; x++) {
                const index = (y * 32 + x) * 4;
                const r = pixels[index];
                const g = pixels[index + 1];
                const b = pixels[index + 2];
                const a = pixels[index + 3];

                if (a > 0) {
                    const color = new ColorJS(
                        ColorJS.spaces.srgb,
                        [r / 255, g / 255, b / 255],
                        a / 255,
                    ).to('lch');
                    setPixel(false, x, y, {
                        l: color.coords[0] / 100,
                        c: color.coords[1],
                        h: isNaN(color.coords[2]) ? 0 : color.coords[2],
                    });
                }
            }
        }

        document.body.removeChild(canvas);
    }

    /** Analyze the current shapes extends and grow them to fill the box */
    function fit() {
        // Find the bounds of all the shapes.
        const bounds = shapes
            .map((s) =>
                s.type === 'pixel'
                    ? {
                          type: 'pixel',
                          left: s.point.x,
                          top: s.point.y,
                          right: s.point.x,
                          bottom: s.point.y,
                      }
                    : s.type === 'rect'
                      ? {
                            type: 'rect',
                            left: s.point.x,
                            top: s.point.y,
                            right: s.point.x + s.width,
                            bottom: s.point.y + s.height,
                        }
                      : s.type === 'ellipse'
                        ? {
                              type: 'ellipse',
                              left: s.point.x,
                              top: s.point.y,
                              right: s.point.x + s.width,
                              bottom: s.point.y + s.height,
                          }
                        : s.type === 'path'
                          ? {
                                type: 'path',
                                left: Math.min(...s.points.map((p) => p.x)),
                                top: Math.min(...s.points.map((p) => p.y)),
                                right: Math.max(...s.points.map((p) => p.x)),
                                bottom: Math.max(...s.points.map((p) => p.y)),
                            }
                          : undefined,
            )
            .filter((b) => b !== undefined);

        const left = Math.min(...bounds.map((b) => b.left));
        const top = Math.min(...bounds.map((b) => b.top));
        const right = Math.max(...bounds.map((b) => b.right));
        const bottom = Math.max(...bounds.map((b) => b.bottom));

        // Determine the center of the shapes
        const centerXOffset =
            Math.round((left + right) / 2) - CharacterSize / 2;
        const centerYOffset =
            Math.round((top + bottom) / 2) - CharacterSize / 2;

        // Grow everything by the specified scale.
        const scale = Math.min(
            CharacterSize / (right - left + 1),
            CharacterSize / (bottom - top + 1),
        );

        // Translate everything to the center of the canvas
        const fitShapes: CharacterShape[] = $state
            .snapshot(shapes)
            .map((shape) => {
                switch (shape.type) {
                    case 'rect': {
                        const width = shape.width * scale;
                        const height = shape.height * scale;
                        return {
                            ...shape,
                            point: {
                                x:
                                    shape.point.x -
                                    centerXOffset -
                                    (width - shape.width) / 2,
                                y:
                                    shape.point.y -
                                    centerYOffset -
                                    (height - shape.height) / 2,
                            },
                            width: width,
                            height: height,
                        };
                    }
                    case 'ellipse': {
                        const width = shape.width * scale;
                        const height = shape.height * scale;
                        return {
                            ...shape,
                            point: {
                                x:
                                    shape.point.x -
                                    centerXOffset -
                                    (width - shape.width) / 2,
                                y:
                                    shape.point.y -
                                    centerYOffset -
                                    (height - shape.height) / 2,
                            },
                            width: width,
                            height: height,
                        };
                    }
                    // No need to update this shape.
                    case 'pixel':
                        return shape;
                    case 'path':
                        // Get the center
                        const center = getPathCenter(shape as CharacterPath);

                        // Offset the points by the translation, and blow them out around the center by the scale.
                        const points = shape.points.map((point) => ({
                            x:
                                point.x -
                                centerXOffset -
                                ((center.x - point.x) * scale) / 2,
                            y:
                                point.y -
                                centerYOffset -
                                ((center.y - point.y) * scale) / 2,
                        }));
                        return {
                            ...shape,
                            points: [points[0], ...points.slice(1)],
                        } satisfies CharacterPath;
                    default:
                        return undefined;
                }
            })
            .filter((s) => s !== undefined);

        // Stretch on the horizontal of it's wider than it is tall.
        const horizontal = right - left > bottom - top;
        const newWidth = horizontal
            ? CharacterSize
            : Math.round((right - left + 1) * scale);
        const newHeight = horizontal
            ? Math.round((bottom - top + 1) * scale)
            : CharacterSize;

        // Sample the pixels to from the centered pixels, and set new ones based on the smaller scale.
        const newPixels: CharacterPixel[] = [];
        for (let x = 0; x < CharacterSize; x++) {
            for (let y = 0; y < CharacterSize; y++) {
                const xProgress = x > newWidth ? undefined : x / newWidth;
                const yProgress = y > newHeight ? undefined : y / newHeight;
                // Sample in the coordinate system of the pixels if on the stretching axis
                const sampleX =
                    xProgress !== undefined
                        ? Math.round(left + xProgress * (right - left + 1))
                        : undefined;
                const sampleY =
                    yProgress !== undefined
                        ? Math.round(top + yProgress * (bottom - top + 1))
                        : undefined;

                // Is there a pixel at this position upsampled position?
                const sample = fitShapes.find(
                    (s) =>
                        s.type === 'pixel' &&
                        s.point.x === sampleX &&
                        s.point.y === sampleY,
                );
                if (sample && sample.fill) {
                    newPixels.push({
                        type: 'pixel',
                        point: {
                            x: x + (CharacterSize - newWidth) / 2,
                            y: y + (CharacterSize - newHeight) / 2,
                        },
                        fill: { ...sample.fill },
                    });
                }
            }
        }

        // Delete the old pixels and add the new ones.
        setShapes(
            [...fitShapes.filter((s) => s.type !== 'pixel'), ...newPixels],
            true,
        );
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
                rememberShapes();
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
    <Title text={(l) => l.ui.page.character.header} subtitle={name} />
</svelte:head>

<!-- Fill and stroke choosers -->
{#snippet colorChooser(
    locales: Locales,
    state: ColorSetting,
    color: LCH,
    /** Whether no fill is allowed */
    none: boolean,
    accessor: (locale: LocaleText) => ModeText<string[]>,
    setState: (state: ColorSetting) => void,
    setColor: (color: LCH) => void,
)}
    <h3>{locales.get(accessor).label}</h3>
    <Mode
        descriptions={accessor}
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
            ? (l) => l.ui.page.character.field.width.label
            : (l) => l.ui.page.character.field.height.label}
        tip={width
            ? (l) => l.ui.page.character.field.width.tip
            : (l) => l.ui.page.character.field.height.tip}
        min={1}
        max={CharacterSize}
        increment={1}
        precision={1}
        unit={''}
        bind:value={
            () => {
                const widths = [
                    ...new Set(
                        selection
                            .filter(
                                (s) =>
                                    s.type === 'rect' || s.type === 'ellipse',
                            )
                            .map((s) => (width ? s.width : s.height)),
                    ),
                ];
                return widths[0] ?? 1;
            },
            (val) => {
                for (const shape of selection)
                    if (shape.type === 'rect' || shape.type === 'ellipse')
                        if (width) shape.width = val;
                        else shape.height = val;
            }
        }
        release={() => rememberShapes()}
    ></Slider>
{/snippet}

<!-- The palette -->
{#snippet palette()}
    <div class="palette">
        <h2
            ><LocalizedText
                path={(l) => l.ui.page.character.field.mode.label}
            /></h2
        >
        <Mode
            descriptions={(l) => l.ui.page.character.field.mode}
            modes={['👆', '⌫', '■', '🔲', '⚪️', '╱', '🙂']}
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
            {:else if mode === DrawingMode.Eraser}
                <LocalizedText path={(l) => l.ui.page.character.shape.eraser} />
            {:else if mode === DrawingMode.Pixel}
                <LocalizedText path={(l) => l.ui.page.character.shape.pixel} />
            {:else if mode === DrawingMode.Rect}
                <LocalizedText path={(l) => l.ui.page.character.shape.rect} />
            {:else if mode === DrawingMode.Ellipse}
                <LocalizedText
                    path={(l) => l.ui.page.character.shape.ellipse}
                />
            {:else if mode === DrawingMode.Path}
                <LocalizedText path={(l) => l.ui.page.character.shape.path} />
            {:else if mode === DrawingMode.Emoji}
                <LocalizedText path={(l) => l.ui.page.character.shape.emoji} />
            {:else}
                <LocalizedText
                    path={(l) => l.ui.page.character.field.mode.modes[0]}
                />…
            {/if}
        </h2>

        <MarkupHTMLView
            markup={mode === DrawingMode.Select && shapes.length === 0
                ? (l) => l.ui.page.character.instructions.empty
                : mode === DrawingMode.Emoji
                  ? (l) => l.ui.page.character.instructions.emoji
                  : mode === DrawingMode.Select &&
                      shapes.length > 0 &&
                      selection.length === 0
                    ? (l) => l.ui.page.character.instructions.unselected
                    : mode === DrawingMode.Select &&
                        shapes.length > 0 &&
                        selection.length > 0
                      ? (l) => l.ui.page.character.instructions.selected
                      : mode === DrawingMode.Eraser
                        ? (l) => l.ui.page.character.instructions.eraser
                        : mode === DrawingMode.Pixel
                          ? (l) => l.ui.page.character.instructions.pixel
                          : mode === DrawingMode.Rect
                            ? (l) => l.ui.page.character.instructions.rect
                            : mode === DrawingMode.Ellipse
                              ? (l) => l.ui.page.character.instructions.ellipse
                              : mode === DrawingMode.Path
                                ? (l) => l.ui.page.character.instructions.path
                                : '—'}
        ></MarkupHTMLView>

        {#if (mode !== DrawingMode.Select && mode !== DrawingMode.Emoji) || selection.length > 0}
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
                // Don't allow none if the stroke is none and not a pixel.
                mode !== DrawingMode.Pixel && currentStrokeSetting !== 'none',
                (l) => l.ui.page.character.field.fill,
                (choice) => {
                    currentFillSetting = choice;
                    const fill = getCurrentFill();
                    if (selection.length > 0) {
                        for (const shape of selection) {
                            if (fill !== undefined) shape.fill = fill;
                            else delete shape.fill;
                        }
                        rememberShapes();
                    }
                },
                (color) => {
                    currentFill = color;
                    const newColor = getCurrentFill();
                    if (selection.length > 0) {
                        for (const shape of selection) {
                            if (newColor !== undefined) shape.fill = newColor;
                            else delete shape.fill;
                        }
                        rememberShapes();
                    }
                },
            )}
            <!-- All shapes except pixels have strokes -->
            {#if mode !== DrawingMode.Pixel || selection.some((s) => s.type !== 'pixel')}
                {@const selectedStrokeColors = Array.from(
                    new Set(
                        selection.map((s) =>
                            'stroke' in s && s.stroke !== undefined
                                ? s.stroke.color === null
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
                    // Don't allow none if the fill is none.
                    currentFillSetting !== 'none',
                    (l) => l.ui.page.character.field.stroke,
                    (choice) => {
                        currentStrokeSetting = choice;
                        const newStroke = getCurrentStroke();
                        if (selection.length > 0) {
                            for (const shape of selection)
                                if (shape.type !== 'pixel') {
                                    if (newStroke !== undefined)
                                        shape.stroke = newStroke;
                                    else delete shape.stroke;
                                }
                            rememberShapes();
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
                                    else {
                                        const stroke = getCurrentStroke();
                                        if (stroke !== undefined)
                                            shape.stroke = stroke;
                                        else delete shape.stroke;
                                    }
                            rememberShapes();
                        }
                    },
                )}
                <!-- If there's a selection and they have the same stroke width, show that, otherwise show the current stroke value. -->
                <Slider
                    label={(l) => l.ui.page.character.field.strokeWidth.label}
                    tip={(l) => l.ui.page.character.field.strokeWidth.tip}
                    min={0.5}
                    max={3}
                    increment={0.25}
                    precision={2}
                    unit={''}
                    bind:value={
                        () => {
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
                        }
                    }
                    release={() => {
                        if (selection.length > 0) rememberShapes();
                    }}
                ></Slider>
            {/if}
            {#if mode !== DrawingMode.Pixel}
                <h3
                    ><LocalizedText
                        path={(l) => l.ui.page.character.shape.shape}
                    /></h3
                >
            {/if}
            <!-- Only rects and radii have a width and height -->
            {#if selection.every((s) => s.type === 'rect' || s.type === 'ellipse')}
                {@render sizeSlider(true)}
                {@render sizeSlider(false)}
            {/if}
            <!-- Only rectangles have a radius -->
            {#if mode === DrawingMode.Rect || selection.some((s) => s.type === 'rect')}
                <Slider
                    label={(l) => l.ui.page.character.field.radius.label}
                    tip={(l) => l.ui.page.character.field.radius.tip}
                    min={0}
                    max={5}
                    increment={0.1}
                    precision={1}
                    unit={''}
                    bind:value={
                        () => {
                            // Uniform corner value? Show that.
                            const corners = [
                                ...new Set(
                                    selection
                                        .filter((s) => s.type === 'rect')
                                        .map((s) => s.corner ?? 0),
                                ),
                            ];
                            return (
                                (corners.length === 1
                                    ? corners[0]
                                    : undefined) ?? currentCorner
                            );
                        },
                        (val) => {
                            if (selection.length > 0) {
                                // Update any selected rectangle's rounded corners.
                                for (const shape of selection)
                                    if (shape.type === 'rect')
                                        shape.corner = val;
                            } else currentCorner = val;
                        }
                    }
                    release={() => {
                        if (selection.length > 0) rememberShapes();
                    }}
                ></Slider>
            {/if}
            <!-- All shapes but pixels have rotation -->
            {#if mode !== DrawingMode.Pixel || selection.some((s) => s.type !== 'pixel')}
                <Slider
                    label={(l) => l.ui.page.character.field.angle.label}
                    tip={(l) => l.ui.page.character.field.angle.tip}
                    min={0}
                    max={359}
                    increment={1}
                    precision={0}
                    unit={''}
                    bind:value={
                        () => {
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
                                    if (shape.type !== 'pixel')
                                        shape.angle = val;
                            } else currentAngle = val;
                        }
                    }
                    release={() => {
                        if (selection.length > 0) rememberShapes();
                    }}
                ></Slider>
            {/if}
            {#if mode === DrawingMode.Path || selection.some((s) => s.type === 'path')}
                <Button
                    tip={(l) => l.ui.page.character.button.horizontal.tip}
                    action={() => flip('horizontal')}
                    active={selection.some((s) => s.type === 'path')}
                    icon="↔"
                >
                    <LocalizedText
                        path={(l) =>
                            l.ui.page.character.button.horizontal.label}
                    />
                </Button>
                <Button
                    tip={(l) => l.ui.page.character.button.vertical.tip}
                    action={() => flip('vertical')}
                    active={selection.some((s) => s.type === 'path')}
                    icon="↕"
                >
                    <LocalizedText
                        path={(l) => l.ui.page.character.button.vertical.label}
                    />
                </Button>
                <label>
                    <Checkbox
                        id="closed-path"
                        bind:on={
                            () => {
                                // If the selection has an identical closed state, set the current closed state to it
                                const closed = [
                                    ...new Set(
                                        selection
                                            .filter((s) => s.type === 'path')
                                            .map((s) => s.closed),
                                    ),
                                ];
                                return (
                                    (closed.length === 1
                                        ? closed[0]
                                        : undefined) ?? currentClosed
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
                                    rememberShapes();
                                } else currentClosed = on;
                            }
                        }
                        label={(l) => l.ui.page.character.field.closed}
                    ></Checkbox><LocalizedText
                        path={(l) => l.ui.page.character.field.closed}
                    />
                </label>
            {/if}
        {/if}
        {#if mode === DrawingMode.Emoji}
            <EmojiChooser
                pick={(emoji) => {
                    importEmoji(emoji);
                    rememberShapes();
                }}
                emoji="🙂"
            />
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
            tip={(l) => l.ui.page.character.button.undo.tip}
            action={() => undo()}
            active={historyIndex > 0}
            icon={UNDO_SYMBOL}
            label={(l) => l.ui.page.character.button.undo.label}
        />
        <Button
            tip={(l) => l.ui.page.character.button.redo.tip}
            action={() => redo()}
            active={historyIndex < history.length - 1}
            icon={REDO_SYMBOL}
            label={(l) => l.ui.page.character.button.redo.label}
        />
        <Button
            tip={(l) => l.ui.page.character.button.all.tip}
            action={() => selectAll()}
            active={shapes.length > 0}
            icon={ALL_SYMBOL}
            label={(l) => l.ui.page.character.button.all.label}
        />
        <Button
            tip={(l) => l.ui.page.character.button.fit.tip}
            action={() => fit()}
            active={shapes.length > 0}
            icon="✥"
            label={(l) => l.ui.page.character.button.fit.label}
        />
        <Button
            tip={(l) => l.ui.page.character.button.toBack.tip}
            action={() => arrange('toBack')}
            active={selection.length > 0 && shapes.length > 1}
            icon="⇡"
            label={(l) => l.ui.page.character.button.toBack.label}
        />
        <Button
            tip={(l) => l.ui.page.character.button.back.tip}
            action={() => arrange('back')}
            active={selection.length > 0 && shapes.length > 1}
            icon={SHARE_SYMBOL}
            label={(l) => l.ui.page.character.button.back.label}
        />
        <Button
            tip={(l) => l.ui.page.character.button.forward.tip}
            action={() => arrange('forward')}
            active={selection.length > 0 && shapes.length > 1}
            icon={BORROW_SYMBOL}
            label={(l) => l.ui.page.character.button.forward.label}
        />
        <Button
            tip={(l) => l.ui.page.character.button.toFront.tip}
            action={() => arrange('toFront')}
            active={selection.length > 0 && shapes.length > 1}
            icon="⇡"
            label={(l) => l.ui.page.character.button.toFront.label}
        />
        <Button
            tip={(l) => l.ui.page.character.button.copy.tip}
            action={copyShapes}
            active={selection.length > 0}
            icon={COPY_SYMBOL}
            label={(l) => l.ui.page.character.button.copy.label}
        />
        <Button
            tip={(l) => l.ui.page.character.button.paste.tip}
            action={pasteShapes}
            active={copy !== undefined}
            icon={PASTE_SYMBOL}
            label={(l) => l.ui.page.character.button.paste.label}
        />
        <Button
            tip={(l) => l.ui.page.character.button.clearPixels.tip}
            action={() => {
                setShapes(shapes.filter((s) => s.type !== 'pixel'));
            }}
            active={shapes.some((s) => s.type === 'pixel')}
            icon={ERASE_SYMBOL}
            label={(l) => l.ui.page.character.button.clearPixels.label}
        />
        <Button
            tip={(l) => l.ui.page.character.button.clear.tip}
            action={() => {
                setShapes([]);
            }}
            active={shapes.length > 0}
            icon={ERASE_SYMBOL}
            label={(l) => l.ui.page.character.button.clear.label}
        />
    </div>

    <style>
        .toolbar {
            display: flex;
            flex-direction: column;
            flex-wrap: wrap;
            align-items: end;
        }
    </style>
{/snippet}

<svelte:body onpointerup={handlePointerUp} />

<Page>
    <section>
        <div class="header">
            <Header block={false} text={(l) => l.ui.page.character.header} />
            <p><LocalizedText path={(l) => l.ui.page.character.prompt} /></p>
        </div>
        {#if $user === null}
            <Notice
                text={(l) => l.ui.page.character.feedback.unauthenticated}
            />
        {:else if persisted === 'loading'}
            <Spinning></Spinning>
        {:else if persisted === 'failed'}
            <Notice text={(l) => l.ui.page.character.feedback.loadfail} />
        {:else if persisted === 'unknown'}
            <Notice text={(l) => l.ui.page.character.feedback.notfound} />
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
                        placeholder={(l) =>
                            l.ui.page.character.field.name.placeholder}
                        description={(l) =>
                            l.ui.page.character.field.name.description}
                        validator={isValidName}
                    ></TextField>
                </h1>
                <RootView
                    node={toProgram(
                        `${Basis.getLocalizedBasis($locales).shares.output.Phrase.names.getNames()[0]}(\`@${Creator.getUsername($user.email ?? '')}/${name}\`)`,
                    )}
                    blocks={false}
                />
                <Dialog
                    header={(l) => l.ui.page.character.share.dialog.header}
                    explanation={(l) =>
                        l.ui.page.character.share.dialog.explanation}
                    button={{
                        tip: (l) => l.ui.page.character.share.button.tip,
                        icon: isPublic ? GLOBE1_SYMBOL : '🤫',
                        label: isPublic
                            ? (l) => l.ui.page.character.share.public.modes[0]
                            : (l) => l.ui.page.character.share.public.modes[1],
                    }}
                >
                    <Mode
                        descriptions={(l) => l.ui.page.character.share.public}
                        choice={isPublic ? 0 : 1}
                        select={(mode) => (isPublic = mode === 0)}
                        modes={[
                            `${GLOBE1_SYMBOL} ${$locales.get(
                                (l) =>
                                    l.ui.page.character.share.public.modes[0],
                            )}`,
                            `🤫 ${$locales.get((l) => l.ui.page.character.share.public.modes[1])}`,
                        ]}
                    />
                    <Labeled
                        label={(l) => l.ui.page.character.share.collaborators}
                    >
                        <CreatorList
                            uids={collaborators}
                            editable
                            anonymize={false}
                            add={(userID) =>
                                (collaborators = [...collaborators, userID])}
                            remove={(userID) =>
                                (collaborators = collaborators.filter(
                                    (c) => c !== userID,
                                ))}
                            removable={() => true}
                        />
                    </Labeled>
                </Dialog>
                {#if $user !== null && editedCharacter !== null && $user.uid === editedCharacter.owner}
                    <ConfirmButton
                        tip={(l) => l.ui.page.character.share.delete.tip}
                        action={() => {
                            if (editedCharacter) {
                                CharactersDB.deleteCharacter(
                                    editedCharacter.id,
                                );
                                goto('/characters');
                            }
                        }}
                        prompt={(l) => l.ui.page.character.share.delete.tip}
                        enabled={editedCharacter !== null}
                        >{CANCEL_SYMBOL}
                        <LocalizedText
                            path={(l) => l.ui.page.character.share.delete.label}
                        /></ConfirmButton
                    >
                {/if}
                <TextBox
                    id="character-description"
                    bind:text={description}
                    placeholder={(l) =>
                        l.ui.page.character.field.description.placeholder}
                    description={(l) =>
                        l.ui.page.character.field.description.description}
                    validator={isValidDescription}
                ></TextBox>
            </div>
            {#if !nameAvailable}
                <Notice text={(l) => l.ui.page.character.feedback.taken} />
            {:else if !savable}
                <Notice text={(l) => l.ui.page.character.feedback.unsaved} />
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
                        ondblclick={handleDoubleClick}
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
                            <Notice>
                                <Button
                                    background
                                    tip={(l) =>
                                        l.ui.page.character.button.end.tip}
                                    action={endPath}
                                    active={pendingPath !== undefined}
                                    icon="🛑"
                                    label={(l) =>
                                        l.ui.page.character.button.end.label}
                                />
                                <LocalizedText
                                    path={(l) =>
                                        l.ui.page.character.feedback.end}
                                /></Notice
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
        justify-content: center;
    }

    .content {
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
        width: min(50vw, 50vh);
        height: min(50vw, 50vh);
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
