<script lang="ts">
    import { page } from '$app/state';
    import { Basis } from '@basis/Basis';
    import Link from '@components/app/Link.svelte';
    import Notice from '@components/app/Notice.svelte';
    import Page from '@components/app/Page.svelte';
    import PageHeaderRow from '@components/app/PageHeaderRow.svelte';
    import Spinning from '@components/app/Spinning.svelte';
    import MarkupHTMLView from '@components/concepts/MarkupHTMLView.svelte';
    import {
        getAnnouncer,
        getUser,
        isAuthenticated,
    } from '@components/project/Contexts';
    import CreatorList from '@components/project/CreatorList.svelte';
    import RootView from '@components/project/RootView.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import Button from '@components/widgets/Button.svelte';
    import Checkbox from '@components/widgets/Checkbox.svelte';
    import ColorChooser from '@components/widgets/ColorChooser.svelte';
    import ConfirmButton from '@components/widgets/ConfirmButton.svelte';
    import Dialog from '@components/widgets/Dialog.svelte';
    import EmojiChooser from '@components/widgets/GlyphChooser.svelte';
    import Labeled from '@components/widgets/Labeled.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Mode from '@components/widgets/Mode.svelte';
    import Slider from '@components/widgets/Slider.svelte';
    import TextBox from '@components/widgets/TextBox.svelte';
    import TextField from '@components/widgets/TextField.svelte';
    import Title from '@components/widgets/Title.svelte';
    import {
        canCurve,
        clampToGrid,
        curvePathPoint,
        deletePathPoint,
        getPathBounds,
        getPriorPoint,
        insertPathPoint,
        straightenPathPoint,
        transformPathPoints,
    } from '@db/characters/paths';
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
    } from '@db/characters/Character';
    import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH } from '@db/limits';
    import { Creator } from '@db/creators/CreatorDatabase';
    import { DB, CharactersDB, disconnected, locales } from '@db/Database';
    import type Project from '@db/projects/Project';
    import Locales from '@locale/Locales';
    import type LocaleText from '@locale/LocaleText';
    import type { Template } from '@locale/LocaleText';
    import { type ModeText } from '@locale/UITexts';
    import ConceptLink, { CharacterName } from '@nodes/ConceptLink';
    import { RGBtoLCH } from '@output/Color/ColorJS';
    import { toProgram } from '@parser/parseProgram';
    import {
        BORROW_SYMBOL,
        CANCEL_SYMBOL,
        COPY_SYMBOL,
        ERASE_SYMBOL,
        GLOBE1_SYMBOL,
        PASTE_SYMBOL,
        REDO_SYMBOL,
        SELECTION_SYMBOL,
        SHARE_SYMBOL,
        UNDO_SYMBOL,
    } from '@parser/Symbols';
    import { NameRegExPattern } from '@parser/Tokenizer';
    import UnicodeString from '@unicode/UnicodeString';
    import { localeGoto } from '@util/localeGoto';
    import { untrack, onMount, tick } from 'svelte';

    const DrawingMode = {
        Select: 0,
        Eraser: 1,
        Pixel: 2,
        Rect: 3,
        Ellipse: 4,
        Path: 5,
        Emoji: 6,
    } as const;
    type DrawingMode = (typeof DrawingMode)[keyof typeof DrawingMode];
    const DrawingModeNames = [
        'Select',
        'Eraser',
        'Pixel',
        'Rect',
        'Ellipse',
        'Path',
        'Emoji',
    ] as const;
    function drawingModeName(m: DrawingMode): string {
        return DrawingModeNames[m];
    }

    type ColorSetting = 'none' | 'inherit' | 'set';
    type LCH = { l: number; c: number; h: number };

    /** So we know who's making this.*/
    const user = getUser();

    /** For announcing changes.*/
    const announce = getAnnouncer();

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
        CharacterRectangle | CharacterEllipse | undefined = $state(undefined);

    /** The pendig path */
    let pendingPath: CharacterPath | undefined = $state(undefined);

    /** The path whose individual points are being edited, if any. */
    let editedPath: CharacterPath | undefined = $state(undefined);

    /** Which handle is chosen: a point, or the control point bending the segment arriving at it. */
    let editedHandle: { index: number; curve: boolean } | undefined =
        $state(undefined);

    /** Whether a handle is being dragged, so pointer moves reposition it. */
    let draggingHandle = $state(false);

    /** The one path the selection is, when it is exactly one: what point editing can act on. */
    let editablePath = $derived.by(() => {
        const only = selection.length === 1 ? selection[0] : undefined;
        return only !== undefined && only.type === 'path' ? only : undefined;
    });

    /** Whether the chosen handle's segment exists, and so can be bent or straightened. */
    let curvableSegment = $derived.by(() => {
        const path = editedPath;
        const handle = editedHandle;
        if (path === undefined || handle === undefined) return false;
        return canCurve(path.points, handle.index, path.closed);
    });

    /** Whether the chosen handle's segment is already curved. */
    let curvedSegment = $derived.by(() => {
        const path = editedPath;
        const handle = editedHandle;
        if (path === undefined || handle === undefined) return false;
        return path.points[handle.index]?.curve !== undefined;
    });

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
        !isAuthenticated($user) ||
            $user.email === null ||
            typeof persisted === 'string'
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

    /** Whether the character has finished loading and the editor (and its
     * controls) should be shown — mirrors the final branch of the template. */
    let loaded = $derived(
        $user !== undefined &&
            isAuthenticated($user) &&
            persisted !== 'loading' &&
            persisted !== 'failed' &&
            persisted !== 'unknown',
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

    /** Track an error message to show the user if a project edit fails. */
    let failedProjects = $state<Project[]>([]);
    let showError = $state(false);

    /** Don't save if the name is not available */
    let savable = $derived(isAuthenticated($user) && $user.email !== null);

    let saving: number | undefined = undefined;
    async function save() {
        // Not loaded yet? Don't save.
        if (typeof persisted === 'string') return;
        // Not changed? Don't save.
        // Not a valid name or description? Don't save.
        if (!savable) return;

        saving = Date.now();

        // Get the raw, non-proxied value.
        const raw = $state.snapshot(editedCharacter) as Character;

        // Save the character.
        const result = await CharactersDB.updateCharacter(
            {
                ...raw,
                updated: saving,
            },
            true,
        );

        if (result !== undefined) {
            failedProjects = result;
            showError = true;
        } else {
            showError = false;
            failedProjects = [];
        }
    }

    function dismissError() {
        showError = false;
        failedProjects = [];
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
        if (page.params.id === undefined) return;

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

    // Point editing belongs to one path; when the selection moves on, so does it.
    $effect(() => {
        const path = editablePath;
        untrack(() => {
            if (editedPath !== undefined && editedPath !== path) {
                editedPath = undefined;
                editedHandle = undefined;
            }
        });
    });

    // When the selection changes, announce it.
    $effect(() => {
        selection;
        untrack(() => {
            if ($announce)
                $announce(
                    'character-selection',
                    $locales.getLanguages()[0],
                    $locales
                        .concretize(
                            (l) => l.ui.page.character.announce.selection,
                            {
                                shapes:
                                    selection.length === 0
                                        ? undefined
                                        : describeShapeKinds(selection),
                            },
                        )
                        .toText(),
                );
        });
    });

    const CharacterNameRegEx = new RegExp(`^${NameRegExPattern}$`, 'u');

    function isValidName(name: string) {
        return CharacterNameRegEx.test(name) &&
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

    /** Say where an undo or redo landed in the history. */
    function announceHistory(
        path: (locale: LocaleText) => Template<['step', 'total']>,
    ) {
        announceEdit(
            'character-history',
            $locales
                .concretize(path, {
                    step: historyIndex + 1,
                    total: history.length,
                })
                .toText(),
        );
    }

    /**
     * Re-anchor the selection and point editing after the history swaps in a fresh
     * clone of the shapes. Everything holding a shape — the selection, the edited
     * path — is pointing into the array that was just replaced, so without this the
     * point handles keep drawing the state the undo just discarded. Shapes keep
     * their order through the history, so their index is what survives it.
     */
    function reanchor(previous: CharacterShape[]) {
        const selected = selection.map((shape) => previous.indexOf(shape));
        const edited = editedPath ? previous.indexOf(editedPath) : -1;

        selection = selected
            .map((index) => shapes[index])
            .filter((shape) => shape !== undefined);

        const path = edited >= 0 ? shapes[edited] : undefined;
        if (path === undefined || path.type !== 'path') {
            editedPath = undefined;
            editedHandle = undefined;
            return;
        }
        editedPath = path;
        // The undo may have taken the point, or the curve, that was chosen.
        if (editedHandle) {
            const index = Math.min(editedHandle.index, path.points.length - 1);
            editedHandle = {
                index,
                curve:
                    editedHandle.curve &&
                    path.points[index]?.curve !== undefined,
            };
        }
    }

    function undo() {
        if (historyIndex > 0) {
            const previous = shapes;
            historyIndex--;
            const previousShapes = history[historyIndex];
            if (previousShapes) shapes = previousShapes;
            reanchor(previous);
            announceHistory((l) => l.ui.page.character.announce.undone);
        }
    }

    function redo() {
        if (historyIndex < history.length - 1) {
            const previous = shapes;
            historyIndex++;
            const futureShapes = history[historyIndex];
            if (futureShapes) shapes = futureShapes;
            reanchor(previous);
            announceHistory((l) => l.ui.page.character.announce.redone);
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

        announceEdit(
            'character-point',
            $locales
                .concretize((l) => l.ui.page.character.announce.drew, { x, y })
                .toText(),
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
        announceEdit(
            'character-point',
            $locales
                .concretize((l) => l.ui.page.character.announce.erased, {
                    x: drawingCursorPosition.x,
                    y: drawingCursorPosition.y,
                })
                .toText(),
        );
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
        // Null fill means "inherit currentColor" — a real value — so test
        // definedness, not truthiness, and omit the key when there is none.
        const fill = getCurrentFill();
        const stroke = getCurrentStroke();
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
            ...(fill !== undefined && { fill }),
            ...(stroke !== undefined && { stroke }),
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
        const fill = getCurrentFill();
        const stroke = getCurrentStroke();
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
            ...(fill !== undefined && { fill }),
            ...(stroke !== undefined && { stroke }),
            ...(currentAngle !== 0 && { angle: currentAngle }),
        };
    }

    function getCurrentPath(): CharacterPath {
        const fill = getCurrentFill();
        const stroke = getCurrentStroke();
        return {
            type: 'path',
            points: [
                { x: drawingCursorPosition.x, y: drawingCursorPosition.y },
            ],
            closed: currentClosed,
            ...(fill !== undefined && { fill }),
            ...(stroke !== undefined && { stroke }),
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
            announceSelectionPosition(
                (l) => l.ui.page.character.announce.moved,
            );
        }
        // In all other moves, move the drawing cursor.
        else {
            drawingCursorPosition = {
                x: Math.max(0, drawingCursorPosition.x + dx),
                y: Math.max(0, drawingCursorPosition.y + dy),
            };

            if ($announce)
                $announce(
                    'drawing-cursor',
                    $locales.getLanguages()[0],
                    $locales
                        .concretize(
                            (l) => l.ui.page.character.announce.position,
                            {
                                x: drawingCursorPosition.x,
                                y: drawingCursorPosition.y,
                            },
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
                const finished = pendingRectOrEllipse;
                selection = [pendingRectOrEllipse];
                pendingRectOrEllipse = undefined;
                mode = DrawingMode.Select;
                announceFinished(finished);
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
            if (
                (event.key === 'Enter' || event.key === ' ') &&
                editablePath !== undefined &&
                editedPath === undefined
            ) {
                editPoints();
                event.stopPropagation();
                event.preventDefault();
                return;
            }
            if (event.key === 'Escape') {
                selection = [];
                event.stopPropagation();
                return;
            }
            // Handle deletion.
            else if (event.key === 'Delete' || event.key === 'Backspace') {
                const remaining = shapes.filter((s) => !selection.includes(s));
                setShapes(remaining);
                selection = [];
                announceEdit(
                    'character-edit',
                    $locales
                        .concretize(
                            (l) => l.ui.page.character.announce.deleted,
                            {
                                count: remaining.length,
                            },
                        )
                        .toText(),
                );
                event.stopPropagation();
                return;
            }
        }
    }

    function selectAll() {
        selection = [...shapes];
    }

    function selectAllOfColor() {
        // Get the color of the current selection.
        const fill = selection[0].fill;

        if (fill === undefined || fill === null) return;

        selection = shapes.filter(
            (s) =>
                s.fill !== undefined &&
                s.fill !== null &&
                s.fill.l === fill.l &&
                s.fill.c === fill.c &&
                s.fill.h === fill.h,
        );
    }

    async function saturation(delta: number) {
        const chromas = shapes
            .map((s) =>
                s.fill
                    ? s.fill.c
                    : 'stroke' in s && s.stroke && s.stroke.color
                      ? s.stroke.color.c
                      : undefined,
            )
            .filter((c): c is number => c !== undefined);
        if (chromas.length === 0) return;
        const min = Math.min(...chromas);
        const max = Math.max(...chromas);
        if (delta < 0 && min === 0) return;
        if (delta > 0 && max === 100) return;
        setShapes(
            shapes.map((shape) => {
                if (shape.fill) {
                    shape.fill.c = Math.max(
                        0,
                        Math.min(100, shape.fill.c + delta),
                    );
                } else if (
                    'stroke' in shape &&
                    shape.stroke &&
                    shape.stroke.color
                ) {
                    shape.stroke.color.c = Math.max(
                        0,
                        Math.min(100, shape.stroke.color.c + delta),
                    );
                }
                return shape;
            }),
        );
    }

    function copyShapes() {
        copy = selection.map(
            (s) => structuredClone($state.snapshot(s)) as CharacterShape,
        );
        announceEdit(
            'character-edit',
            $locales
                .concretize((l) => l.ui.page.character.announce.copied, {
                    shapes: describeShapeKinds(selection),
                    count: selection.length,
                })
                .toText(),
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
            announceSelectionPosition(
                (l) => l.ui.page.character.announce.pasted,
            );
        }
    }

    /** Say that a shape is done, and where it ended up. */
    function announceFinished(shape: CharacterShape) {
        const corner =
            shape.type === 'path'
                ? { x: getPathBounds(shape).left, y: getPathBounds(shape).top }
                : shape.point;
        announceEdit(
            'character-edit',
            $locales
                .concretize((l) => l.ui.page.character.announce.finished, {
                    shape: describeShapeKinds([shape]),
                    x: Math.round(corner.x),
                    y: Math.round(corner.y),
                })
                .toText(),
        );
    }

    function endPath() {
        if (pendingPath) {
            if (pendingPath.points.length < 2) {
                setShapes(shapes.filter((s) => s !== pendingPath));
                pendingPath = undefined;
            } else {
                const finished = pendingPath;
                selection = [pendingPath];
                pendingPath = undefined;
                // Mark history
                rememberShapes();
                mode = DrawingMode.Select;
                announceFinished(finished);
            }
        }
    }

    /** The kinds of shape in a list, named in the language the live region declares. */
    function describeShapeKinds(list: CharacterShape[]): string {
        return list
            .map((shape) =>
                $locales.getPrimaryPlainText(
                    (l) => l.ui.page.character.shape[shape.type],
                ),
            )
            .join(', ');
    }

    /** Where the selection sits now, as its top left corner on the grid. */
    function selectionCorner(): Point {
        const boxes = selection.map((shape) =>
            shape.type === 'path'
                ? getPathBounds(shape)
                : { left: shape.point.x, top: shape.point.y },
        );
        return {
            x: Math.round(Math.min(...boxes.map((b) => b.left))),
            y: Math.round(Math.min(...boxes.map((b) => b.top))),
        };
    }

    /** Announce something that has to name where the selection landed, because the
     *  destination is the only part of "moved" or "flipped" that differs between
     *  two presses — without it the region repeats itself and is heard once. */
    function announceSelectionPosition(
        path: (locale: LocaleText) => Template<['x', 'y']>,
    ) {
        if (selection.length === 0) return;
        const corner = selectionCorner();
        announceEdit(
            'character-point',
            $locales.concretize(path, { x: corner.x, y: corner.y }).toText(),
        );
    }

    /** Say something about an edit, in the one language the live region declares. */
    function announceEdit(
        kind: 'character-point' | 'character-edit' | 'character-history',
        message: string,
    ) {
        if ($announce) $announce(kind, $locales.getLanguages()[0], message);
    }

    /** The grid point under a pointer, in path coordinates — intersections, not cells. */
    function pointerToGrid(event: PointerEvent): Point | undefined {
        if (canvasView === null) return undefined;
        const bounds = canvasView.getBoundingClientRect();
        return clampToGrid({
            x: ((event.clientX - bounds.left) / bounds.width) * CharacterSize,
            y: ((event.clientY - bounds.top) / bounds.height) * CharacterSize,
        });
    }

    /** The live position of the chosen handle, which callers may move in place. */
    function handlePoint(): Point | undefined {
        if (editedPath === undefined || editedHandle === undefined)
            return undefined;
        const point = editedPath.points[editedHandle.index];
        if (point === undefined) return undefined;
        return editedHandle.curve ? point.curve : point;
    }

    /** How a handle is named, both as its focus-time label and when it moves. */
    function describeHandle(
        index: number,
        curve: boolean,
        position: Point,
    ): string {
        const inputs = { index: index + 1, x: position.x, y: position.y };
        return (
            curve
                ? $locales.concretize(
                      (l) => l.ui.page.character.announce.control,
                      inputs,
                  )
                : $locales.concretize(
                      (l) => l.ui.page.character.announce.point,
                      inputs,
                  )
        ).toText();
    }

    /**
     * Say where the chosen handle is. Only ever on a change: a handle's aria-label
     * already says this when it takes focus, and announcing that too would say it twice.
     */
    function announceHandle() {
        const handle = editedHandle;
        const position = handlePoint();
        if (handle === undefined || position === undefined) return;
        announceEdit(
            'character-point',
            describeHandle(handle.index, handle.curve, position),
        );
    }

    /** Move focus to a handle once it exists in the DOM. */
    async function focusHandle(index: number, curve: boolean) {
        await tick();
        const view = canvasView?.querySelector(
            `[data-handle="${curve ? 'curve' : 'point'}-${index}"]`,
        );
        if (view instanceof HTMLElement)
            setKeyboardFocus(view, 'Focus the path handle.');
    }

    function editPoints() {
        const path = editablePath;
        if (path === undefined) return;
        editedPath = path;
        editedHandle = { index: 0, curve: false };
        announceEdit(
            'character-edit',
            $locales
                .concretize((l) => l.ui.page.character.announce.editing, {
                    count: path.points.length,
                })
                .toText(),
        );
        focusHandle(0, false);
    }

    function stopEditingPoints() {
        if (editedPath === undefined) return;
        editedPath = undefined;
        editedHandle = undefined;
        if (canvasView) setKeyboardFocus(canvasView, 'Focus the canvas.');
        announceEdit(
            'character-edit',
            $locales.getPrimaryPlainText(
                (l) => l.ui.page.character.announce.editingDone,
            ),
        );
    }

    /** Put the chosen handle somewhere, snapped and clamped. Remembering is the caller's
     *  job, so a drag leaves one history entry rather than one per pixel crossed. */
    function setHandlePosition(position: Point) {
        const target = handlePoint();
        if (target === undefined) return;
        const { x, y } = clampToGrid(position);
        target.x = x;
        target.y = y;
    }

    function moveHandle(dx: number, dy: number) {
        const target = handlePoint();
        if (target === undefined) return;
        setHandlePosition({ x: target.x + dx, y: target.y + dy });
        rememberShapes();
        announceHandle();
    }

    function addPoint() {
        const path = editedPath;
        const handle = editedHandle;
        if (path === undefined || handle === undefined) return;
        const result = insertPathPoint(path.points, handle.index, path.closed);
        if (result.points === path.points) return;
        path.points = result.points;
        rememberShapes();
        editedHandle = { index: result.index, curve: false };
        const added = path.points[result.index];
        if (added)
            announceEdit(
                'character-edit',
                $locales
                    .concretize(
                        (l) => l.ui.page.character.announce.pointAdded,
                        { index: result.index + 1, x: added.x, y: added.y },
                    )
                    .toText(),
            );
        focusHandle(result.index, false);
    }

    function removePoint() {
        const path = editedPath;
        const handle = editedHandle;
        if (path === undefined || handle === undefined) return;
        // On a curve's handle, removing means straightening the segment: the point
        // it bends toward is still wanted, the bend isn't.
        if (handle.curve) return straightenSegment();
        const remaining = deletePathPoint(path.points, handle.index);
        if (remaining === undefined) return;
        path.points = remaining;
        rememberShapes();
        announceEdit(
            'character-edit',
            $locales
                .concretize((l) => l.ui.page.character.announce.pointRemoved, {
                    index: handle.index + 1,
                    count: remaining.length,
                })
                .toText(),
        );
        const index = Math.min(handle.index, remaining.length - 1);
        editedHandle = { index, curve: false };
        focusHandle(index, false);
    }

    function curveSegment() {
        const path = editedPath;
        const handle = editedHandle;
        if (path === undefined || handle === undefined) return;
        const curved = curvePathPoint(path.points, handle.index, path.closed);
        if (curved === undefined) return;
        path.points = curved;
        rememberShapes();
        announceEdit(
            'character-edit',
            $locales
                .concretize((l) => l.ui.page.character.announce.curved, {
                    index: handle.index + 1,
                })
                .toText(),
        );
        // Bending it is the next thing they want, so put them on the new handle.
        editedHandle = { index: handle.index, curve: true };
        focusHandle(handle.index, true);
    }

    function straightenSegment() {
        const path = editedPath;
        const handle = editedHandle;
        if (path === undefined || handle === undefined) return;
        if (path.points[handle.index]?.curve === undefined) return;
        path.points = straightenPathPoint(path.points, handle.index);
        rememberShapes();
        announceEdit(
            'character-edit',
            $locales
                .concretize((l) => l.ui.page.character.announce.straightened, {
                    index: handle.index + 1,
                })
                .toText(),
        );
        editedHandle = { index: handle.index, curve: false };
        focusHandle(handle.index, false);
    }

    function startHandleDrag(
        event: PointerEvent,
        index: number,
        curve: boolean,
    ) {
        if (!(event.currentTarget instanceof HTMLElement)) return;
        editedHandle = { index, curve };
        draggingHandle = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        event.stopPropagation();
        event.preventDefault();
    }

    function dragHandle(event: PointerEvent) {
        if (!draggingHandle) return;
        const position = pointerToGrid(event);
        if (position === undefined) return;
        setHandlePosition(position);
        event.stopPropagation();
    }

    function endHandleDrag(event: PointerEvent) {
        if (!draggingHandle) return;
        draggingHandle = false;
        if (
            event.currentTarget instanceof HTMLElement &&
            event.currentTarget.hasPointerCapture(event.pointerId)
        )
            event.currentTarget.releasePointerCapture(event.pointerId);
        rememberShapes();
        announceHandle();
        event.stopPropagation();
    }

    function handleHandleKey(
        event: KeyboardEvent,
        index: number,
        curve: boolean,
    ) {
        // Tab stays Tab: it's how one moves between handles, and swallowing it
        // inside role="application" would trap the keyboard here.
        if (event.key === 'Tab') return;
        editedHandle = { index, curve };
        if (event.key === 'ArrowLeft') moveHandle(-1, 0);
        else if (event.key === 'ArrowRight') moveHandle(1, 0);
        else if (event.key === 'ArrowUp') moveHandle(0, -1);
        else if (event.key === 'ArrowDown') moveHandle(0, 1);
        else if (event.key === 'Enter' || event.key === ' ') addPoint();
        else if (event.key === 'Delete' || event.key === 'Backspace')
            removePoint();
        else if (event.key === 'Escape') stopEditingPoints();
        else return;
        event.stopPropagation();
        event.preventDefault();
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
        if (mode === DrawingMode.Select) {
            if (editedPath === undefined) editPoints();
        } else if (mode === DrawingMode.Path) {
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
                    const color = RGBtoLCH(r / 255, g / 255, b / 255);
                    setPixel(false, x, y, {
                        l: (color.coords[0] ?? 0) / 100,
                        c: color.coords[1] ?? 0,
                        h: isNaN(color.coords[2] ?? 0)
                            ? 0
                            : (color.coords[2] ?? 0),
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
                          ? { type: 'path', ...getPathBounds(s) }
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
                    case 'path': {
                        // Get the center
                        const center = getPathCenter(shape);

                        // Offset the points by the translation, and blow them out around the center by the scale.
                        return {
                            ...shape,
                            points: transformPathPoints(
                                shape.points,
                                ({ x, y }) => ({
                                    x:
                                        x -
                                        centerXOffset -
                                        ((center.x - x) * scale) / 2,
                                    y:
                                        y -
                                        centerYOffset -
                                        ((center.y - y) * scale) / 2,
                                }),
                            ),
                        } satisfies CharacterPath;
                    }
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

        // Nothing varies here because nothing varies in the action: fitting
        // twice does nothing the second time, so there is nothing new to say.
        announceEdit(
            'character-edit',
            $locales.getPrimaryPlainText(
                (l) => l.ui.page.character.announce.fitted,
            ),
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
                shapes = newShapes;
                rememberShapes();
            }
        }
        const moved = selection[0];
        if (moved)
            announceEdit(
                'character-edit',
                $locales
                    .concretize((l) => l.ui.page.character.announce.arranged, {
                        index: shapes.indexOf(moved) + 1,
                        total: shapes.length,
                    })
                    .toText(),
            );
    }

    function flip(direction: 'horizontal' | 'vertical') {
        for (const shape of selection) {
            if (shape.type === 'path') {
                const center = getPathCenter(shape);
                shape.points = transformPathPoints(shape.points, ({ x, y }) =>
                    direction === 'horizontal'
                        ? { x: center.x - (x - center.x), y }
                        : { x, y: center.y - (y - center.y) },
                );
            }
        }
        announceSelectionPosition((l) => l.ui.page.character.announce.flipped);
    }

    // Renaming a character rewrites the projects that reference it, which
    // reads the loaded projects — so bring them in when the page opens
    // rather than making the rename itself wait.
    onMount(() => void DB.startProjectWork());
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
    <h3><LocalizedText path={(l) => accessor(l).label} /></h3>
    <Mode
        modes={accessor}
        icons={['🚫', '❏', '🎨']}
        omit={none ? [] : [0]}
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

{#snippet handles()}
    {#if editedPath}
        {@const path = editedPath}
        <!-- The guides sit under the handles and take no pointer events, so that
             getShapeUnderPointer's elementFromPoint never mistakes one for a shape. -->
        <svg
            class="guides"
            viewBox="0 0 {CharacterSize} {CharacterSize}"
            aria-hidden="true"
        >
            {#each path.points as point, index (index)}
                {@const from = getPriorPoint(path.points, index, path.closed)}
                {#if point.curve && from}
                    <line
                        x1={from.x}
                        y1={from.y}
                        x2={point.curve.x}
                        y2={point.curve.y}
                    />
                    <line
                        x1={point.curve.x}
                        y1={point.curve.y}
                        x2={point.x}
                        y2={point.y}
                    />
                {/if}
            {/each}
        </svg>
        <div class="handles">
            {#each path.points as point, index (index)}
                {#if point.curve}
                    {@const control = point.curve}
                    <button
                        type="button"
                        class="handle curve"
                        class:chosen={editedHandle?.index === index &&
                            editedHandle.curve}
                        data-handle="curve-{index}"
                        style:left="{(100 * control.x) / CharacterSize}%"
                        style:top="{(100 * control.y) / CharacterSize}%"
                        aria-label={describeHandle(index, true, control)}
                        onfocus={() => (editedHandle = { index, curve: true })}
                        onkeydown={(event) =>
                            handleHandleKey(event, index, true)}
                        onpointerdown={(event) =>
                            startHandleDrag(event, index, true)}
                        onpointermove={dragHandle}
                        onpointerup={endHandleDrag}
                    ></button>
                {/if}
                <button
                    type="button"
                    class="handle point"
                    class:chosen={editedHandle?.index === index &&
                        !editedHandle.curve}
                    data-handle="point-{index}"
                    style:left="{(100 * point.x) / CharacterSize}%"
                    style:top="{(100 * point.y) / CharacterSize}%"
                    aria-label={describeHandle(index, false, point)}
                    onfocus={() => (editedHandle = { index, curve: false })}
                    onkeydown={(event) => handleHandleKey(event, index, false)}
                    onpointerdown={(event) =>
                        startHandleDrag(event, index, false)}
                    onpointermove={dragHandle}
                    onpointerup={endHandleDrag}
                ></button>
            {/each}
        </div>
    {/if}

    <style>
        .guides {
            pointer-events: none;

            line {
                stroke: var(--wordplay-highlight-color);
                stroke-width: 0.25;
                stroke-dasharray: 0.5, 0.5;
            }
        }

        .handles {
            position: absolute;
            inset: 0;
            /* Only the handles themselves take pointer events, so the canvas
               underneath still handles clicks that miss one. */
            pointer-events: none;
        }

        /* The box is the target, not the dot: WCAG 2.5.8 wants 24px, but a
           point sits on a 32-unit grid where 24px spans two whole units, so the
           mark that shows where the point *is* has to stay small. The button is
           a transparent 24px square centered on the point and the dot is drawn
           inside it. */
        .handle {
            position: absolute;
            width: 24px;
            height: 24px;
            padding: 0;
            border: none;
            background: none;
            transform: translate(-50%, -50%);
            pointer-events: auto;
            cursor: grab;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .handle::before {
            content: '';
            display: block;
            width: 1em;
            height: 1em;
            background: var(--wordplay-background);
            border: solid var(--wordplay-foreground) var(--wordplay-focus-width);
        }

        .handle.point::before {
            border-radius: 50%;
        }

        /* A control point is drawn smaller and cornered so it reads as a handle
           for a segment rather than a point of the path itself. */
        .handle.curve::before {
            width: 0.75em;
            height: 0.75em;
            border-color: var(--wordplay-highlight-color);
            rotate: 45deg;
        }

        .handle.chosen::before {
            background: var(--wordplay-highlight-color);
        }

        .handle:focus-visible {
            outline: none;
        }

        .handle:focus-visible::before {
            outline: var(--wordplay-focus-color) solid
                var(--wordplay-focus-width);
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
            modes={(l) => l.ui.page.character.field.mode}
            icons={[SELECTION_SYMBOL, ERASE_SYMBOL, '■', '🔲', '⚪️', '╱', '🙂']}
            choice={mode}
            select={(choice: number) => {
                mode = choice as DrawingMode;
                if (canvasView)
                    setKeyboardFocus(canvasView, 'Focus the canvas.');
            }}
            labeled={false}
            wrap
        ></Mode>

        <!-- Say what's being drawn or selected selected -->
        <h2>
            {#if selection.length > 0}
                {Array.from(new Set(selection.map((s) => s.type)))
                    .map((s) =>
                        $locales.getMultilingualText(
                            (l) => l.ui.page.character.shape[s],
                        ),
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
                    path={(l) => l.ui.page.character.field.mode.labels[0]}
                />…
            {/if}
        </h2>

        <!-- The canvas points at this with aria-describedby, so the id belongs
             here rather than on the view inside, which takes no id. -->
        <div id="instructions">
            <MarkupHTMLView
                markup={editedPath !== undefined
                    ? (l) => l.ui.page.character.instructions.points
                    : mode === DrawingMode.Select && shapes.length === 0
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
                                    ? (l) =>
                                          l.ui.page.character.instructions
                                              .ellipse
                                    : mode === DrawingMode.Path
                                      ? (l) =>
                                            l.ui.page.character.instructions
                                                .path
                                      : '—'}
            ></MarkupHTMLView>
        </div>

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
                showCustom={false}
                pick={(emoji) => {
                    importEmoji(emoji);
                    rememberShapes();
                }}
                glyph="🙂"
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
            icon={SELECTION_SYMBOL}
            label={(l) => l.ui.page.character.button.all.label}
        />
        <Button
            tip={(l) => l.ui.page.character.button.allColor.tip}
            action={() => selectAllOfColor()}
            // Active if there's one or more pixels with the same color
            active={shapes.length > 0 &&
                new Set(
                    selection
                        .filter((s) => s.fill !== undefined && s.fill !== null)
                        .map((s) =>
                            s.fill ? `${s.fill.l}${s.fill.c}${s.fill.h}` : '',
                        ),
                ).size === 1}
            icon={SELECTION_SYMBOL}
            label={(l) => l.ui.page.character.button.allColor.label}
        />
        <Button
            tip={(l) => l.ui.page.character.button.saturationUp.tip}
            action={() => saturation(5)}
            active={shapes.every(
                (s) =>
                    (s.fill && s.fill.c < 100) ||
                    ('stroke' in s &&
                        s.stroke &&
                        s.stroke.color &&
                        s.stroke.color.c < 100),
            )}
            icon="↑"
            label={(l) => l.ui.page.character.button.saturationUp.label}
        /><Button
            tip={(l) => l.ui.page.character.button.saturationDown.tip}
            action={() => saturation(-5)}
            active={shapes.every(
                (s) =>
                    (s.fill && s.fill.c > 0) ||
                    ('stroke' in s &&
                        s.stroke &&
                        s.stroke.color &&
                        s.stroke.color.c > 0),
            )}
            icon="↓"
            label={(l) => l.ui.page.character.button.saturationDown.label}
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
        <!-- Point editing is reachable entirely from here, so no key is required
             to find it; the keys on the handles are the accelerator. -->
        {#if editedPath === undefined}
            <Button
                tip={(l) => l.ui.page.character.button.editPoints.tip}
                action={editPoints}
                active={editablePath !== undefined}
                icon="⌗"
                label={(l) => l.ui.page.character.button.editPoints.label}
            />
        {:else}
            <Button
                tip={(l) => l.ui.page.character.button.donePoints.tip}
                action={stopEditingPoints}
                icon="⌗"
                label={(l) => l.ui.page.character.button.donePoints.label}
            />
            <Button
                tip={(l) => l.ui.page.character.button.addPoint.tip}
                action={addPoint}
                active={editedHandle !== undefined}
                icon="✚"
                label={(l) => l.ui.page.character.button.addPoint.label}
            />
            <Button
                tip={(l) => l.ui.page.character.button.deletePoint.tip}
                action={removePoint}
                active={editedHandle !== undefined &&
                    editedPath.points.length > 2}
                icon={CANCEL_SYMBOL}
                label={(l) => l.ui.page.character.button.deletePoint.label}
            />
            {#if curvedSegment}
                <Button
                    tip={(l) => l.ui.page.character.button.straighten.tip}
                    action={straightenSegment}
                    icon="╱"
                    label={(l) => l.ui.page.character.button.straighten.label}
                />
            {:else}
                <Button
                    tip={(l) => l.ui.page.character.button.curve.tip}
                    action={curveSegment}
                    active={curvableSegment}
                    icon="◡"
                    label={(l) => l.ui.page.character.button.curve.label}
                />
            {/if}
        {/if}
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
        <PageHeaderRow header={(l) => l.ui.page.character.header}>
            {#snippet controls()}
                {#if loaded}
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
                                max="8em"
                                maxlength={MAX_NAME_LENGTH}
                            ></TextField>
                        </h1>
                        <RootView
                            node={toProgram(
                                `${Basis.getLocalizedBasis($locales).shares.output.Phrase.names.getNames()[0]}(\`@${Creator.getUsername($user?.email ?? '')}/${name}\`)`,
                            )}
                            blocks={false}
                        />
                        <Dialog
                            id="character-share"
                            header={(l) =>
                                l.ui.page.character.share.dialog.header}
                            explanation={(l) =>
                                l.ui.page.character.share.dialog.explanation}
                            button={{
                                background: true,
                                tip: (l) =>
                                    l.ui.page.character.share.button.tip,
                                icon: isPublic ? GLOBE1_SYMBOL : '🤫',
                                label: isPublic
                                    ? (l) =>
                                          l.ui.page.character.share.public
                                              .labels[0]
                                    : (l) =>
                                          l.ui.page.character.share.public
                                              .labels[1],
                            }}
                        >
                            <Mode
                                modes={(l) => l.ui.page.character.share.public}
                                choice={isPublic ? 0 : 1}
                                select={(mode) => (isPublic = mode === 0)}
                                icons={[GLOBE1_SYMBOL, '🤫']}
                            />
                            <Labeled
                                label={(l) =>
                                    l.ui.page.character.share.collaborators}
                            >
                                <CreatorList
                                    uids={collaborators}
                                    editable
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
                        </Dialog>
                        {#if isAuthenticated($user) && editedCharacter !== null && $user.uid === editedCharacter.owner}
                            <ConfirmButton
                                tip={(l) =>
                                    l.ui.page.character.share.delete.tip}
                                action={async () => {
                                    if (
                                        editedCharacter &&
                                        (await CharactersDB.deleteCharacter(
                                            editedCharacter.id,
                                        ))
                                    )
                                        localeGoto('/characters');
                                }}
                                prompt={(l) =>
                                    l.ui.page.character.share.delete.tip}
                                enabled={editedCharacter !== null &&
                                    !$disconnected}
                                >{CANCEL_SYMBOL}
                                <LocalizedText
                                    path={(l) =>
                                        l.ui.page.character.share.delete.label}
                                /></ConfirmButton
                            >
                        {/if}
                        <TextBox
                            id="character-description"
                            bind:text={description}
                            maxrows={3}
                            maxlength={MAX_DESCRIPTION_LENGTH}
                            placeholder={(l) =>
                                l.ui.page.character.field.description
                                    .placeholder}
                            description={(l) =>
                                l.ui.page.character.field.description
                                    .description}
                            validator={isValidDescription}
                        ></TextBox>
                    </div>
                {/if}
            {/snippet}
        </PageHeaderRow>

        {#if showError && failedProjects.length > 0}
            <Notice>
                <div>
                    <span
                        ><LocalizedText
                            path={(l) =>
                                l.ui.page.character.feedback.projecteditfail}
                        /></span
                    >
                    {#each failedProjects as project, index}
                        <Link to={project.getLink(false)}>
                            <span>
                                {#if project.getName()}
                                    {project.getName()}
                                {:else}
                                    <LocalizedText
                                        path={(l) =>
                                            l.ui.page.character.feedback
                                                .untitledproject}
                                    />
                                {/if}
                            </span>
                        </Link>
                        {#if index < failedProjects.length - 1}{', '}
                        {/if}
                    {/each}
                    <Button
                        tip={(l) => l.ui.page.character.button.dismissError.tip}
                        action={dismissError}
                        icon="✕"
                    />
                </div>
            </Notice>
        {/if}

        {#if $user === undefined}
            <Spinning></Spinning>
        {:else if !isAuthenticated($user)}
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
            {#if !nameAvailable}
                <Notice text={(l) => l.ui.page.character.feedback.taken} />
            {/if}

            <div class="editor">
                {@render toolbar()}
                <div class="content">
                    <!-- role="application" is correct for a drawing canvas
                         that owns pointer gestures and arrow-key commands,
                         but Svelte's linter doesn't treat application as
                         interactive — the same false positive ColorChooser
                         documents. -->
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
                    <div
                        role="application"
                        aria-describedby="instructions"
                        class={['canvas', drawingModeName(mode).toLowerCase()]}
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
                        {@render handles()}
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
        /* Stay vertically centered in the group; baseline alignment made the
           preview drift upward as the description field grew taller. */
        align-self: center;
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
