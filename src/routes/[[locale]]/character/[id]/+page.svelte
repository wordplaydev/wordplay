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
        flipShape,
        getBrushCells,
        getLineCells,
        getPriorPoint,
        getShapeBounds,
        getShapesBounds,
        insertPathPoint,
        MaxBrushSize,
        straightenPathPoint,
        transformPathPoints,
    } from '@db/characters/paths';
    import {
        canRedo,
        canUndo,
        currentState,
        record,
        redo as redoHistory,
        startHistory,
        undo as undoHistory,
        type History,
    } from '@db/characters/history';
    import {
        CharacterSize,
        characterToSVG,
        getPathCenter,
        getShapeAnchor,
        getSharedColor,
        moveShape,
        pixelsAreEqual,
        type Character,
        type CharacterEllipse,
        type CharacterGlyph,
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
    import OverflowToolbar from '@components/widgets/OverflowToolbar.svelte';
    import ImageImporter from './ImageImporter.svelte';
    import {
        Faces,
        faceSupportsWeight,
        FontWeights,
        getFaceDescription,
        type FontWeight,
    } from '@basis/faces/Fonts';
    import FaceName from '@components/settings/FaceName.svelte';
    import Options from '@components/widgets/Options.svelte';
    import { MaxPaletteColors } from '@components/widgets/ColorChooser.svelte';
    import { traceGlyph, type GlyphError } from '@db/characters/glyph';
    import { pixelsFromRGBA, withPixelLayer } from '@db/characters/raster';
    import { hasEmoji } from '@unicode/emoji';
    import Locales from '@locale/Locales';
    import type {
        LocaleTextAccessor,
        LocaleTextsAccessor,
        TemplateInput,
    } from '@locale/Locales';
    import { controlKeyLabel } from '@components/editor/commands/shortcuts';
    import type LocaleText from '@locale/LocaleText';
    import type { Template } from '@locale/LocaleText';
    import { type ModeText } from '@locale/UITexts';
    import ConceptLink, { CharacterName } from '@nodes/ConceptLink';
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
        Symbol: 6,
        Image: 7,
    } as const;
    type DrawingMode = (typeof DrawingMode)[keyof typeof DrawingMode];
    const DrawingModeNames = [
        'Select',
        'Eraser',
        'Pixel',
        'Rect',
        'Ellipse',
        'Path',
        'Symbol',
        'Image',
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

    /** The undo history, whose current state is always what the editor is showing. */
    let history: History<CharacterShape[]> = $state.raw(startHistory([]));

    /** The character `history` holds the past of, so a reload of the same
     *  character doesn't restart it. Not $state: nothing renders from it. */
    let historyFor: string | undefined = undefined;

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

    /** How many cells across the pixel brush and the eraser cover (#898). */
    let currentBrushSize = $state(1);

    /** Whether a chosen symbol is added as pixels or as a traced outline (#924).
     *  One tool, two ways in: the chooser is the same either way, so there is
     *  nothing to validate and no second tool to find. */
    let currentInsertion = $state<'pixels' | 'outline'>('pixels');

    /** Which face a symbol is rasterized or traced from. Emoji get the
     *  monochrome emoji face by default: the color one is a bitmap/OT-SVG face
     *  with no outline to trace, and rasterizing wants color, so the default
     *  follows the insertion. */
    let currentFace = $state<string>('Noto Sans');
    let currentWeight = $state<FontWeight>(400);
    let currentItalic = $state(false);
    /** How many cells across a traced symbol is placed. */
    let currentGlyphSize = $state(CharacterSize);

    /** The last symbol the chooser picked, so changing a font or weight retraces
     *  it rather than making the creator pick again. */
    let currentSymbol = $state<string | undefined>(undefined);
    /** Why the last trace failed, if it did. */
    let glyphProblem = $state<GlyphError | undefined>(undefined);
    let glyphLoading = $state(false);
    /** Bumped per request so a slow trace can't overwrite a newer one. */
    let glyphRequest = 0;

    /** The current border radius for rectangles */
    let currentCorner = $state(0);

    /** The current rotation */
    let currentAngle = $state(0);

    /** The closed path state */
    let currentClosed = $state(true);

    /** The last pixel drawn while dragging, so we can fill in pixels between them with interpolation. */
    let lastPixel = $state<CharacterPixel | undefined>(undefined);

    /** Where each tool last sampled, so a drag can fill the gap between samples.
     *  Tracked as cursor positions rather than pixels: a sample that changed
     *  nothing still moved the cursor, and the stroke has to follow it. */
    let lastDrawn = $state<Point | undefined>(undefined);
    let lastErased = $state<Point | undefined>(undefined);

    /** The HTML element of the canvas */
    let canvasView: HTMLDivElement | null = $state(null);

    /**
     * The width below which the editor stacks its three columns.
     *
     * Kept in sync by hand with the `@container (max-width: 700px)` rule in this
     * component's style block: CSS can't tell the script what matched, and the
     * toolbar's contents depend on the layout, not just its shape.
     */
    const NARROW_THRESHOLD_PX = 700;

    let editorView: HTMLDivElement | null = $state(null);
    let narrow = $state(false);

    $effect(() => {
        const view = editorView;
        if (view === null || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => {
            narrow = view.clientWidth < NARROW_THRESHOLD_PX;
        });
        observer.observe(view);
        return () => observer.disconnect();
    });

    /**
     * Return focus to the canvas when a command the creator was on disappears.
     *
     * Narrow, the toolbar drops commands as they stop being usable, and a button
     * that is removed while focused leaves focus on <body> — where no key does
     * anything and a screen reader says nothing. The canvas is where the work
     * is, so that's where focus goes.
     */
    function handleToolbarFocusOut(event: FocusEvent) {
        if (!narrow || event.relatedTarget !== null) return;
        // The button may simply have been clicked; only rescue focus that has
        // actually fallen off the document's interactive content.
        if (
            document.activeElement !== null &&
            document.activeElement !== document.body
        )
            return;
        if (canvasView) setKeyboardFocus(canvasView, 'Focus the canvas.');
    }

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

    /**
     * The box the cursor indicator draws, so it shows the cells a stroke will
     * actually cover rather than always one. Mirrors getBrushCells' origin bias
     * for even sizes, which is why the offset isn't simply half the size.
     */
    let cursorBrush = $derived.by(() => ({
        left: drawingCursorPosition.x - Math.floor((currentBrushSize - 1) / 2),
        top: drawingCursorPosition.y - Math.floor((currentBrushSize - 1) / 2),
        size:
            mode === DrawingMode.Pixel || mode === DrawingMode.Eraser
                ? currentBrushSize
                : 1,
    }));

    /**
     * One command in the editor's toolbar.
     *
     * The toolbar is data rather than markup because a narrow layout renders
     * only the commands that are currently usable: twenty-one buttons wrap into
     * a wall on a phone, and most of them are disabled most of the time.
     */
    type CharacterCommand = {
        /** Stable across renders so the {#each} can key on it, and a button the
         *  creator is reaching for isn't torn down when a sibling appears. */
        id: string;
        tip: LocaleTextAccessor;
        label: LocaleTextAccessor;
        icon: string;
        action: () => void;
        active: boolean;
    };

    let commands: CharacterCommand[] = $derived.by(() => [
        {
            id: 'undo',
            tip: (l) => l.ui.page.character.button.undo.tip,
            label: (l) => l.ui.page.character.button.undo.label,
            icon: UNDO_SYMBOL,
            action: () => undo(),
            active: canUndo(history),
        },
        {
            id: 'redo',
            tip: (l) => l.ui.page.character.button.redo.tip,
            label: (l) => l.ui.page.character.button.redo.label,
            icon: REDO_SYMBOL,
            action: () => redo(),
            active: canRedo(history),
        },
        {
            id: 'all',
            tip: (l) => l.ui.page.character.button.all.tip,
            label: (l) => l.ui.page.character.button.all.label,
            icon: SELECTION_SYMBOL,
            action: () => selectAll(),
            active: shapes.length > 0,
        },
        {
            id: 'allColor',
            tip: (l) => l.ui.page.character.button.allColor.tip,
            label: (l) => l.ui.page.character.button.allColor.label,
            icon: SELECTION_SYMBOL,
            action: () => selectAllOfColor(),
            // Active if there's one or more pixels with the same color
            active:
                shapes.length > 0 &&
                new Set(
                    selection
                        .filter((s) => s.fill !== undefined && s.fill !== null)
                        .map((s) =>
                            s.fill ? `${s.fill.l}${s.fill.c}${s.fill.h}` : '',
                        ),
                ).size === 1,
        },
        {
            id: 'saturationUp',
            tip: (l) => l.ui.page.character.button.saturationUp.tip,
            label: (l) => l.ui.page.character.button.saturationUp.label,
            icon: '↑',
            action: () => saturation(5),
            // every() is vacuously true on an empty character, which offered
            // saturation as the only command on a blank canvas.
            active:
                shapes.length > 0 &&
                shapes.every(
                    (s) =>
                        (s.fill && s.fill.c < 100) ||
                        ('stroke' in s &&
                            s.stroke &&
                            s.stroke.color &&
                            s.stroke.color.c < 100),
                ),
        },
        {
            id: 'saturationDown',
            tip: (l) => l.ui.page.character.button.saturationDown.tip,
            label: (l) => l.ui.page.character.button.saturationDown.label,
            icon: '↓',
            action: () => saturation(-5),
            active:
                shapes.length > 0 &&
                shapes.every(
                    (s) =>
                        (s.fill && s.fill.c > 0) ||
                        ('stroke' in s &&
                            s.stroke &&
                            s.stroke.color &&
                            s.stroke.color.c > 0),
                ),
        },
        {
            id: 'fit',
            tip: (l) => l.ui.page.character.button.fit.tip,
            label: (l) => l.ui.page.character.button.fit.label,
            icon: '✥',
            action: () => fit(),
            active: shapes.length > 0,
        },
        {
            id: 'toBack',
            tip: (l) => l.ui.page.character.button.toBack.tip,
            label: (l) => l.ui.page.character.button.toBack.label,
            icon: '⇡',
            action: () => arrange('toBack'),
            active: selection.length > 0 && shapes.length > 1,
        },
        {
            id: 'back',
            tip: (l) => l.ui.page.character.button.back.tip,
            label: (l) => l.ui.page.character.button.back.label,
            icon: SHARE_SYMBOL,
            action: () => arrange('back'),
            active: selection.length > 0 && shapes.length > 1,
        },
        {
            id: 'forward',
            tip: (l) => l.ui.page.character.button.forward.tip,
            label: (l) => l.ui.page.character.button.forward.label,
            icon: BORROW_SYMBOL,
            action: () => arrange('forward'),
            active: selection.length > 0 && shapes.length > 1,
        },
        {
            id: 'toFront',
            tip: (l) => l.ui.page.character.button.toFront.tip,
            label: (l) => l.ui.page.character.button.toFront.label,
            icon: '⇡',
            action: () => arrange('toFront'),
            active: selection.length > 0 && shapes.length > 1,
        },
        {
            id: 'copy',
            tip: (l) => l.ui.page.character.button.copy.tip,
            label: (l) => l.ui.page.character.button.copy.label,
            icon: COPY_SYMBOL,
            action: copyShapes,
            active: selection.length > 0,
        },
        {
            id: 'paste',
            tip: (l) => l.ui.page.character.button.paste.tip,
            label: (l) => l.ui.page.character.button.paste.label,
            icon: PASTE_SYMBOL,
            action: pasteShapes,
            active: copy !== undefined,
        },
        // Point editing is reachable entirely from here, so no key is required
        // to find it; the keys on the handles are the accelerator.
        ...(editedPath === undefined
            ? [
                  {
                      id: 'editPoints',
                      tip: (l: LocaleText) =>
                          l.ui.page.character.button.editPoints.tip,
                      label: (l: LocaleText) =>
                          l.ui.page.character.button.editPoints.label,
                      icon: '⌗',
                      action: editPoints,
                      active: editablePath !== undefined,
                  },
              ]
            : [
                  {
                      id: 'donePoints',
                      tip: (l: LocaleText) =>
                          l.ui.page.character.button.donePoints.tip,
                      label: (l: LocaleText) =>
                          l.ui.page.character.button.donePoints.label,
                      icon: '⌗',
                      action: stopEditingPoints,
                      active: true,
                  },
                  {
                      id: 'addPoint',
                      tip: (l: LocaleText) =>
                          l.ui.page.character.button.addPoint.tip,
                      label: (l: LocaleText) =>
                          l.ui.page.character.button.addPoint.label,
                      icon: '✚',
                      action: addPoint,
                      active: editedHandle !== undefined,
                  },
                  {
                      id: 'deletePoint',
                      tip: (l: LocaleText) =>
                          l.ui.page.character.button.deletePoint.tip,
                      label: (l: LocaleText) =>
                          l.ui.page.character.button.deletePoint.label,
                      icon: CANCEL_SYMBOL,
                      action: removePoint,
                      active:
                          editedHandle !== undefined &&
                          !editedHandle.curve &&
                          editedPath.points.length > 2,
                  },
                  curvedSegment
                      ? {
                            id: 'straighten',
                            tip: (l: LocaleText) =>
                                l.ui.page.character.button.straighten.tip,
                            label: (l: LocaleText) =>
                                l.ui.page.character.button.straighten.label,
                            icon: '╱',
                            action: straightenSegment,
                            active: true,
                        }
                      : {
                            id: 'curve',
                            tip: (l: LocaleText) =>
                                l.ui.page.character.button.curve.tip,
                            label: (l: LocaleText) =>
                                l.ui.page.character.button.curve.label,
                            icon: '◡',
                            action: curveSegment,
                            active: curvableSegment,
                        },
              ]),
        {
            id: 'clearPixels',
            tip: (l) => l.ui.page.character.button.clearPixels.tip,
            label: (l) => l.ui.page.character.button.clearPixels.label,
            icon: ERASE_SYMBOL,
            action: () => setShapes(shapes.filter((s) => s.type !== 'pixel')),
            active: shapes.some((s) => s.type === 'pixel'),
        },
        {
            id: 'clear',
            tip: (l) => l.ui.page.character.button.clear.tip,
            label: (l) => l.ui.page.character.button.clear.label,
            icon: ERASE_SYMBOL,
            action: () => setShapes([]),
            active: shapes.length > 0,
        },
    ]);

    /**
     * The commands the toolbar shows. Stacked under the canvas there is no room
     * for a wall of mostly-disabled buttons, so only what's usable is offered;
     * beside the canvas the full set stays put, so a command doesn't move under
     * the pointer as the selection changes.
     */
    let visibleCommands = $derived(
        narrow ? commands.filter((command) => command.active) : commands,
    );

    /**
     * What the instructions region says, chosen by tool and selection state.
     * The two arms that name a modifier key pass $control rather than writing
     * "ctrl/cmd": `/` is markup's italic delimiter, so the literal opened an
     * emphasis run that swallowed the rest of the paragraph, and the label
     * needs to be the platform's anyway. concretize substitutes inputs after
     * parsing the template, so a substituted ⌘ can't open a run of its own.
     */
    let instructions:
        | LocaleTextsAccessor
        | [LocaleTextsAccessor, Record<string, TemplateInput>] = $derived.by(
        () => {
            const control = { control: controlKeyLabel() };
            if (editedPath !== undefined)
                return (l) => l.ui.page.character.instructions.points;
            if (mode === DrawingMode.Select) {
                if (shapes.length === 0)
                    return (l) => l.ui.page.character.instructions.empty;
                return selection.length === 0
                    ? [
                          (l) => l.ui.page.character.instructions.unselected,
                          control,
                      ]
                    : [
                          (l) => l.ui.page.character.instructions.selected,
                          control,
                      ];
            }
            switch (mode) {
                case DrawingMode.Symbol:
                    return (l) => l.ui.page.character.instructions.symbol;
                case DrawingMode.Image:
                    return (l) => l.ui.page.character.instructions.image;
                case DrawingMode.Eraser:
                    return (l) => l.ui.page.character.instructions.eraser;
                case DrawingMode.Pixel:
                    return (l) => l.ui.page.character.instructions.pixel;
                case DrawingMode.Rect:
                    return (l) => l.ui.page.character.instructions.rect;
                case DrawingMode.Ellipse:
                    return (l) => l.ui.page.character.instructions.ellipse;
                case DrawingMode.Path:
                    return (l) => l.ui.page.character.instructions.path;
            }
        },
    );

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

    /**
     * The colors the current shapes use, most-used first and capped.
     *
     * Counted into a map rather than deduplicated by scanning the rest of the
     * list: an imported photo can leave hundreds of distinct colors on a 32x32
     * grid, which made the old pairwise scan hundreds of thousands of
     * comparisons on every shape change — and offered every one of them as a
     * focusable swatch, burying the standard colors under a wall of near
     * duplicates. Ordering by use is what makes the cap keep the ones a
     * creator would actually reach for.
     */
    let colors: [number, number, number][] = $derived.by(() => {
        const counts = new Map<
            string,
            { color: [number, number, number]; count: number }
        >();
        function count(c: { l: number; c: number; h: number }) {
            const color: [number, number, number] = [c.l * 100, c.c, c.h];
            const key = color.join(',');
            const seen = counts.get(key);
            if (seen) seen.count++;
            else counts.set(key, { color, count: 1 });
        }
        for (const s of shapes) {
            switch (s.type) {
                case 'pixel':
                    if (s.fill) count(s.fill);
                    break;
                case 'rect':
                case 'ellipse':
                case 'path':
                case 'glyph':
                    if (s.fill) count(s.fill);
                    if (s.stroke && s.stroke.color !== null)
                        count(s.stroke.color);
            }
        }
        return Array.from(counts.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, MaxPaletteColors)
            .map(({ color }) => color);
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

                    // Only when this is a different character. This effect
                    // re-runs on any URL change, and Dialog persists its open
                    // state with goto() — so closing a dialog used to throw
                    // away the undo stack, which is what left an image import
                    // with nothing to undo.
                    if (historyFor !== loadedCharacter.id) {
                        history = startHistory(
                            structuredClone(loadedCharacter.shapes),
                        );
                        historyFor = loadedCharacter.id;
                    }

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

    // Point editing belongs to one path in one mode; when the selection moves on,
    // or a drawing tool takes over, so does it. Reset rather than
    // stopEditingPoints, so switching tools doesn't pull focus back to the canvas
    // or talk over the mode change.
    $effect(() => {
        const path = editablePath;
        const drawing = mode !== DrawingMode.Select;
        untrack(() => {
            if (editedPath !== undefined && (drawing || editedPath !== path)) {
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

        // Drop any shape that's no longer here, but only reassign when one
        // actually went: the selection announcement fires on every assignment,
        // and a constant one alternating with an edit's announcement is heard
        // as the editor saying "selected path" after every arrow key.
        const kept = selection.filter((s) => newShapes.includes(s));
        if (kept.length !== selection.length) selection = kept;

        // Update the shapes.
        shapes = newShapes;

        // Record where this landed, not where it came from: callers that mutate
        // in place and callers that build a new array have to agree on what one
        // undo means.
        if (remember)
            history = record(
                history,
                structuredClone($state.snapshot(shapes)) as CharacterShape[],
            );
    }

    /** Say where an undo or redo landed in the history. */
    function announceHistory(
        path: (locale: LocaleText) => Template<['step', 'total']>,
    ) {
        announceEdit(
            'character-history',
            $locales
                .concretize(path, {
                    step: history.index + 1,
                    total: history.states.length,
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
        if (!canUndo(history)) return;
        history = undoHistory(history);
        restoreShapes();
        announceHistory((l) => l.ui.page.character.announce.undone);
    }

    function redo() {
        if (!canRedo(history)) return;
        history = redoHistory(history);
        restoreShapes();
        announceHistory((l) => l.ui.page.character.announce.redone);
    }

    /** Show the state the history is now on. Cloned rather than handed over, since
     *  the editor edits shapes in place and would otherwise rewrite its own past. */
    function restoreShapes() {
        const restoring = currentState(history);
        if (restoring === undefined) return;
        // An undo that changes the number of points removes the handle focus was
        // on, and focus falls to the document — so put it back, but only if it
        // was here to begin with, so a Ctrl+Z typed in the palette stays there.
        const focused = document.activeElement;
        const wasOnHandle =
            focused instanceof Element &&
            focused.closest('[data-handle]') !== null;
        const previous = shapes;
        shapes = structuredClone(restoring) as CharacterShape[];
        reanchor(previous);
        if (wasOnHandle && editedHandle)
            focusHandle(editedHandle.index, editedHandle.curve);
    }

    /** Set the pixel at the current position and fill. */
    /**
     * Paint the brush at a point, in one edit.
     *
     * A brush wider than one cell covers a square, so this rebuilds the shapes
     * array once for the whole square rather than once per cell: the filter is
     * linear in the drawing, and a size-8 brush would otherwise do sixty-four
     * passes over it per sample of a drag.
     */
    function setPixel(
        remember = true,
        x?: number | undefined,
        y?: number | undefined,
        color?: LCH,
    ): CharacterPixel | undefined {
        x = x ?? drawingCursorPosition.x;
        y = y ?? drawingCursorPosition.y;

        const fill = { ...(color ?? currentFill) };
        const cells = getBrushCells({ x, y }, currentBrushSize);
        const candidates: CharacterPixel[] = cells.map((point) => ({
            type: 'pixel',
            point,
            fill: { ...fill },
        }));

        // Nothing to do when every cell already holds this exact pixel, which
        // is what keeps a stationary pointer from filling the undo history.
        const covered = new Set(cells.map((c) => `${c.x},${c.y}`));
        const existing = shapes.filter(
            (s): s is CharacterPixel =>
                s.type === 'pixel' && covered.has(`${s.point.x},${s.point.y}`),
        );
        if (
            existing.length === candidates.length &&
            candidates.every((candidate) =>
                existing.some((s) => pixelsAreEqual(s, candidate)),
            )
        )
            return undefined;

        // Remember the pixel the cursor's own cell replaced, so a later double
        // click can flood fill what was there.
        replacedPixel = existing.find(
            (s) => s.point.x === x && s.point.y === y,
        );

        setShapes(
            [
                ...shapes.filter(
                    (s) =>
                        s.type !== 'pixel' ||
                        !covered.has(`${s.point.x},${s.point.y}`),
                ),
                ...candidates,
            ],
            remember,
        );

        announceEdit(
            'character-point',
            $locales
                .concretize((l) => l.ui.page.character.announce.drew, { x, y })
                .toText(),
        );

        // The cell under the cursor is what the caller tracks as the last
        // pixel, so interpolation joins cursor positions rather than corners.
        return candidates.find((c) => c.point.x === x && c.point.y === y);
    }

    function erasePixel(remember = true, at?: Point) {
        const { x, y } = at ?? drawingCursorPosition;
        const covered = new Set(
            getBrushCells({ x, y }, currentBrushSize).map(
                (c) => `${c.x},${c.y}`,
            ),
        );
        const removed = shapes.filter(
            (s) =>
                s.type !== 'pixel' || !covered.has(`${s.point.x},${s.point.y}`),
        );
        if (removed.length === shapes.length) return false;
        setShapes(removed, remember);
        announceEdit(
            'character-point',
            $locales
                .concretize((l) => l.ui.page.character.announce.erased, {
                    x,
                    y,
                })
                .toText(),
        );
        return true;
    }

    /** The width every palette row gives its label, so the widgets beside them
     *  line up with each other rather than starting wherever the text ends. */
    const PaletteLabelWidth = '4em';

    /** Whether a shape is boxed by a width and height the size sliders can set. */
    function isSizable(
        shape: CharacterShape,
    ): shape is CharacterRectangle | CharacterEllipse | CharacterGlyph {
        return (
            shape.type === 'rect' ||
            shape.type === 'ellipse' ||
            shape.type === 'glyph'
        );
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
                // Mark history, as finishing with the pointer does.
                rememberShapes();
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
            // Pasting is one discrete result, not a stream, so it goes in the
            // lane that never drops it.
            announceSelectionPosition(
                (l) => l.ui.page.character.announce.pasted,
                'character-edit',
            );
        }
    }

    /** Say that a shape is done, and where it ended up. */
    function announceFinished(shape: CharacterShape) {
        const corner = shapeCorner(shape);
        announceEdit(
            'character-edit',
            $locales
                .concretize((l) => l.ui.page.character.announce.finished, {
                    shape: describeShapeKinds([shape]),
                    x: corner.x,
                    y: corner.y,
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

    /** Where a shape sits, as the top left corner of the box it occupies. */
    function shapeCorner(shape: CharacterShape): Point {
        const box = getShapeBounds(shape);
        return { x: Math.round(box.left), y: Math.round(box.top) };
    }

    /** Where the selection sits now, as its top left corner on the grid. */
    function selectionCorner(): Point {
        const box = getShapesBounds(selection);
        return box === undefined
            ? { x: 0, y: 0 }
            : { x: Math.round(box.left), y: Math.round(box.top) };
    }

    /** Announce something that has to name where the selection landed, because the
     *  destination is the only part of "moved" or "flipped" that differs between
     *  two presses — without it the region repeats itself and is heard once. */
    function announceSelectionPosition(
        path: (locale: LocaleText) => Template<['x', 'y']>,
        kind: 'character-point' | 'character-edit' = 'character-point',
    ) {
        if (selection.length === 0) return;
        const corner = selectionCorner();
        announceEdit(
            kind,
            $locales.concretize(path, { x: corner.x, y: corner.y }).toText(),
        );
    }

    /** Say something about an edit, in the one language the live region declares. */
    function announceEdit(
        kind:
            | 'character-point'
            | 'character-edit'
            | 'character-history'
            // A refusal — nothing in it can vary between two firings, which is
            // exactly what the interrupt lane is for.
            | 'ignored',
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
        // Preventing the default keeps the canvas from taking the gesture, but it
        // also suppresses the focus this press would have given the button — and
        // without focus the next arrow key moves the whole path rather than the
        // point just dragged. So take it explicitly.
        event.preventDefault();
        setKeyboardFocus(event.currentTarget, 'Focus the path handle.');
    }

    function dragHandle(event: PointerEvent) {
        if (!draggingHandle) return;
        const position = pointerToGrid(event);
        if (position === undefined) return;
        setHandlePosition(position);
        event.stopPropagation();
    }

    function cancelHandleDrag() {
        draggingHandle = false;
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

    /**
     * Activation that didn't come from a press we already handled. A real keypress
     * acts on keydown and is preventDefaulted, so it synthesizes no click, and a
     * pointer press carries a detail count — leaving a detail-less click as an
     * assistive technology (VoiceOver, switch access, voice control) activating
     * the button, which would otherwise do nothing at all.
     */
    function handleHandleClick(
        event: MouseEvent,
        index: number,
        curve: boolean,
    ) {
        if (event.detail !== 0) return;
        editedHandle = { index, curve };
        addPoint();
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

    /**
     * Fill the gap a fast drag leaves between two sampled positions.
     *
     * Both tools need this: without it a quick stroke draws — or erases — a
     * dotted line, which is half of what #898 reported as having to erase
     * "box by box".
     */
    function interpolate(
        startPoint: Point,
        endPoint: Point,
        fill: CharacterPixel['fill'] | undefined,
    ) {
        const cells = getLineCells(startPoint, endPoint).flatMap((cell) =>
            getBrushCells(cell, currentBrushSize),
        );
        if (cells.length === 0) return;

        const covered = new Set(cells.map((c) => `${c.x},${c.y}`));
        // Erasing: fill is undefined, so the cells are removed rather than added.
        if (fill === undefined) {
            const removed = shapes.filter(
                (s) =>
                    s.type !== 'pixel' ||
                    !covered.has(`${s.point.x},${s.point.y}`),
            );
            if (removed.length !== shapes.length) setShapes(removed, false);
            return;
        }

        const painted: CharacterPixel[] = cells.map((point) => ({
            type: 'pixel',
            point,
            fill: fill === null ? null : { ...fill },
        }));
        if (
            painted.every((p) =>
                shapes.some((s) => s.type === 'pixel' && pixelsAreEqual(s, p)),
            )
        )
            return;
        setShapes(
            [
                ...shapes.filter(
                    (s) =>
                        s.type !== 'pixel' ||
                        !covered.has(`${s.point.x},${s.point.y}`),
                ),
                ...painted,
            ],
            false,
        );
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
            // A press starts a new stroke, so it has nothing to join back to.
            if (!move) lastDrawn = undefined;
            // Read where the last sample was before painting this one; the two
            // are joined by cursor position rather than by the pixel setPixel
            // returns, which is undefined whenever the cell was already this
            // color — passing over an old pixel would otherwise break the chain
            // and leave the rest of the stroke dotted.
            const previous = lastDrawn;
            const newPixel = setPixel(false);
            if (newPixel) {
                lastPixel = newPixel;
                strokePixels = 1;
            }

            if (move && previous !== undefined) {
                interpolate(previous, drawingCursorPosition, {
                    ...currentFill,
                });
                strokePixels++;
            }
            lastDrawn = { ...drawingCursorPosition };

            if (canvasView) setKeyboardFocus(canvasView, 'Focus the canvas.');
            return;
        } else if (mode === DrawingMode.Eraser) {
            selection = [];
            // If not moving, see what shape is under the pointer and delete it.
            if (!move) {
                strokePixels = 0;
                // Where the stroke starts, so the first drag sample joins back
                // to the press rather than leaving the cells between untouched.
                lastErased = { ...drawingCursorPosition };
                const under = getShapeUnderPointer(event);
                if (under !== null) {
                    const removed = shapes.filter((s) => s !== under);
                    if (removed.length !== shapes.length) {
                        strokePixels++;
                        setShapes(removed);
                    }
                }
            } else {
                // Join this sample to the last one, so a fast drag erases a
                // stroke rather than a dotted line.
                if (lastErased !== undefined)
                    interpolate(lastErased, drawingCursorPosition, undefined);
                if (erasePixel(false)) strokePixels++;
                lastErased = { ...drawingCursorPosition };
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
        } else if (
            mode === DrawingMode.Select ||
            mode === DrawingMode.Symbol ||
            mode === DrawingMode.Image
        ) {
            // Symbol and image add their content from the palette rather than by
            // drawing, so a press on the canvas did nothing at all in those
            // modes. Pointing at something picks it up and switches to the mode
            // that edits it, which is also where a drag can carry on from.
            const placing = mode !== DrawingMode.Select;
            // A drag begun in a placing mode has nothing to carry: bail before
            // the offsets below, which would otherwise be left behind for the
            // next real drag to read.
            if (placing && move) return;

            if (!move) {
                const under = getShapeUnderPointer(event);
                // Pressing empty canvas keeps the tool: losing it to a mistap
                // would be worse than doing nothing, which is what it did before.
                if (placing && under === null) return;
                if (placing) mode = DrawingMode.Select;

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
                firstDrag = true;
                // One offset per selected shape, by construction. This used to
                // push per shape kind, which meant a kind with no case (glyphs)
                // contributed nothing — so it wouldn't drag, and every shape
                // after it in a mixed selection read someone else's offset and
                // jumped.
                dragOffsets = selection.map((shape) => {
                    const anchor = getShapeAnchor(shape);
                    return { x: x - anchor.x, y: y - anchor.y };
                });
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

    /**
     * Replace the pixel layer in one edit, keeping every other shape.
     *
     * Both ways of importing land here, so they behave the same: an import is a
     * background to draw on, not a stamp added to what's there. The pixel brush
     * still appends, so a stroke drawn by hand lands on top.
     *
     * One rebuild of the shapes array rather than one per pixel: a 32x32 import
     * is up to 1,024 pixels, and setPixel filters the whole drawing each time,
     * which made importing quadratic and fired the per-pixel announcement a
     * thousand times.
     */
    function setPixelLayer(pixels: CharacterPixel[]) {
        if (pixels.length === 0) return;
        setShapes(withPixelLayer($state.snapshot(shapes), pixels), true);
    }

    /** Rasterize a symbol in the chosen face and lay it down as pixels. */
    function importSymbolAsPixels(symbol: string) {
        const character = new UnicodeString(symbol).at(0)?.toString() ?? '';
        if (character.length === 0) return;

        // A detached canvas rasterizes the same as an attached one; the old
        // code appended it to the document to look at it while debugging.
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx === null) return;
        canvas.width = CharacterSize;
        canvas.height = CharacterSize;

        // Emoji only have color in the color face; everything else follows the
        // creator's chosen font, which the old hard-coded emoji face ignored.
        const face = hasEmoji(character) ? 'Noto Color Emoji' : currentFace;
        ctx.font = `${currentItalic ? 'italic ' : ''}${currentWeight} ${CharacterSize - 3}px "${face}"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(character, CharacterSize / 2, CharacterSize + 1);

        setPixelLayer(
            pixelsFromRGBA(
                ctx.getImageData(0, 0, CharacterSize, CharacterSize).data,
            ),
        );
        showCanvas();
    }

    /**
     * Trace a symbol's outline and place it, centered, as a glyph shape.
     *
     * Asynchronous, because the font file has to be fetched: the request token
     * drops a slow trace whose result is no longer what was asked for, which is
     * what a quick change of font would otherwise leave on the canvas.
     */
    async function importSymbolAsOutline(symbol: string) {
        const character = new UnicodeString(symbol).at(0)?.toString() ?? '';
        if (character.length === 0) return;

        const token = ++glyphRequest;
        glyphLoading = true;
        glyphProblem = undefined;

        // The color emoji face is a bitmap/SVG face with no outline to trace,
        // so an emoji traces from the monochrome one instead of being refused.
        const face = hasEmoji(character) ? 'Noto Emoji' : currentFace;
        const traced = await traceGlyph({
            character,
            face,
            weight: currentWeight,
            italic: currentItalic,
        });
        if (token !== glyphRequest) return;
        glyphLoading = false;

        if (typeof traced === 'string') {
            glyphProblem = traced;
            announceEdit(
                'ignored',
                $locales.getPrimaryPlainText(glyphProblemText(traced)),
            );
            return;
        }

        // Fit the traced ink inside a square of the chosen size without
        // distorting it, then center it on the canvas.
        const height =
            traced.aspect >= 1
                ? currentGlyphSize / traced.aspect
                : currentGlyphSize;
        const width = height * traced.aspect;
        const glyph: CharacterGlyph = {
            type: 'glyph',
            character,
            // The face the trace actually used, which may not be the chosen one
            // when that face has no shape for this character.
            face: traced.face,
            weight: currentWeight,
            point: {
                x: (CharacterSize - width) / 2,
                y: (CharacterSize - height) / 2,
            },
            width,
            height,
            d: traced.d,
            ...(currentItalic ? { italic: true } : {}),
            ...(getCurrentFill() !== undefined
                ? { fill: getCurrentFill() ?? null }
                : {}),
        };
        addShapes(glyph, true);
        // Select what `shapes` holds, not the literal above: assigning into
        // $state wraps it, and everything that acts on a selection — the
        // dashed outline, the drag, the size sliders — compares by identity, so
        // selecting the unwrapped object left a glyph that looked selected and
        // couldn't be moved.
        const placed = shapes.at(-1);
        selection = placed ? [placed] : [];
        // Back to Select, as finishing a rectangle or an ellipse does: the
        // point of placing a symbol is to then position and size it, and only
        // Select mode drags.
        mode = DrawingMode.Select;
        showCanvas();
        announceFinished(glyph);
    }

    /** The faces a symbol can be traced or rasterized from. The color emoji face
     *  is omitted: it has no outlines to trace, and emoji already route to it
     *  for rasterizing regardless of what's chosen here. */
    let faceOptions = $derived(
        Object.entries(Faces)
            .filter(([name]) => name !== 'Noto Color Emoji')
            .map(([name, face]) => ({
                value: name,
                label: getFaceDescription($locales, name, face),
                face,
            })),
    );

    /** Only the weights the chosen face actually has files for. */
    let weightOptions = $derived.by(() => {
        const face = Faces[currentFace];
        return FontWeights.filter(
            (weight) => face === undefined || faceSupportsWeight(face, weight),
        ).map((weight) => ({ value: `${weight}`, label: `${weight}` }));
    });

    /** Narrow a chooser's string back to a weight, since Options speaks strings. */
    function toFontWeight(value: string | undefined): FontWeight {
        const weight = FontWeights.find((w) => `${w}` === value);
        return weight ?? 400;
    }

    /**
     * Bring the canvas back into view after the palette adds something to it.
     *
     * The chooser and the importer sit at the bottom of a tall palette, and the
     * canvas is above it when the layout is stacked — so what a creator just
     * added could land off screen with nothing to say it had worked. 'nearest'
     * scrolls the least that makes it visible, and does nothing when it already is.
     */
    function showCanvas() {
        canvasView?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    /** Which message explains a failed trace. */
    function glyphProblemText(problem: GlyphError): LocaleTextAccessor {
        switch (problem) {
            case 'uncovered':
            case 'unsupported':
                return (l) => l.ui.page.character.feedback.glyphMissing;
            case 'empty':
                return (l) => l.ui.page.character.feedback.glyphEmpty;
            default:
                return (l) => l.ui.page.character.feedback.glyphUnreadable;
        }
    }

    /** Analyze the current shapes extends and grow them to fill the box */
    function fit() {
        // Find the bounds of all the shapes.
        // Nothing to grow, and the arithmetic below would be NaN all the way down.
        const bounds = getShapesBounds(shapes);
        if (bounds === undefined) return;
        const { left, top, right, bottom } = bounds;

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
                    // A glyph is boxed like a rectangle, so it scales like one.
                    case 'glyph':
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
                }
            });

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

    /**
     * Mirror the selection as a group, about the box it occupies. Flipping each
     * shape about its own center is why this used to touch paths only: a
     * rectangle, an ellipse and a pixel are symmetric about their own centers, so
     * there was nothing for it to do to them, and the button silently did nothing
     * for every shape but a path. Mirroring about the selection's box also keeps a
     * path inside the box it already had, which the old point-average axis did not.
     */
    function flip(direction: 'horizontal' | 'vertical') {
        const box = getShapesBounds(selection);
        if (box === undefined) return;
        for (const shape of selection) flipShape(shape, box, direction);
        rememberShapes();
        announceSelectionPosition(
            (l) => l.ui.page.character.announce.flipped,
            'character-edit',
        );
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
                        onclick={(event) =>
                            handleHandleClick(event, index, true)}
                        onkeydown={(event) =>
                            handleHandleKey(event, index, true)}
                        onpointerdown={(event) =>
                            startHandleDrag(event, index, true)}
                        onpointermove={dragHandle}
                        onpointerup={endHandleDrag}
                        onpointercancel={cancelHandleDrag}
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
                    onclick={(event) => handleHandleClick(event, index, false)}
                    onkeydown={(event) => handleHandleKey(event, index, false)}
                    onpointerdown={(event) =>
                        startHandleDrag(event, index, false)}
                    onpointermove={dragHandle}
                    onpointerup={endHandleDrag}
                    onpointercancel={cancelHandleDrag}
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

        /* Chosen carries a shape change as well as a fill, so it survives
           forced-colors mode and reads without color. */
        .handle.chosen::before {
            background: var(--wordplay-highlight-color);
            scale: 1.35;
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
                            .filter((s) => isSizable(s))
                            .map((s) => (width ? s.width : s.height)),
                    ),
                ];
                return widths[0] ?? 1;
            },
            (val) => {
                for (const shape of selection)
                    if (isSizable(shape))
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
            icons={[
                SELECTION_SYMBOL,
                ERASE_SYMBOL,
                '■',
                '🔲',
                '⚪️',
                '╱',
                '🙂',
                '🖼',
            ]}
            choice={mode}
            select={(choice: number) => {
                mode = choice as DrawingMode;
                // Drop the selection: the palette heading names the selection
                // before the mode, so a leftover one hid which tool was
                // chosen — and every property of a selected shape is editable
                // in Select mode anyway.
                selection = [];
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
            {:else if mode === DrawingMode.Symbol}
                <LocalizedText path={(l) => l.ui.page.character.shape.symbol} />
            {:else if mode === DrawingMode.Image}
                <LocalizedText path={(l) => l.ui.page.character.shape.image} />
            {:else}
                <LocalizedText
                    path={(l) => l.ui.page.character.field.mode.labels[0]}
                />…
            {/if}
        </h2>

        <!-- The canvas points at this with aria-describedby, so the id belongs
             here rather than on the view inside, which takes no id. -->
        <div id="instructions">
            <MarkupHTMLView markup={instructions}></MarkupHTMLView>
        </div>

        <!-- How wide the brush and the eraser are. Shown for both tools, so the
             size the eraser will clear is the size the brush just drew (#898).
             The slider is a native range, so it voices its own value; adding an
             announcement here would be a second describer for one change. -->
        {#if mode === DrawingMode.Pixel || mode === DrawingMode.Eraser}
            <Slider
                label={(l) => l.ui.page.character.field.brushSize.label}
                tip={(l) => l.ui.page.character.field.brushSize.tip}
                min={1}
                max={MaxBrushSize}
                increment={1}
                precision={0}
                unit={''}
                bind:value={currentBrushSize}
            ></Slider>
        {/if}

        <!-- Nothing in this section applies to a symbol or an image: neither
             places a shape whose fill, stroke or size is set here. -->
        {#if (mode !== DrawingMode.Select && mode !== DrawingMode.Symbol && mode !== DrawingMode.Image) || selection.length > 0}
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
            <!-- Rectangles, ellipses and glyphs are all boxed by a width and
                 height. every() is true of an empty selection, so the length
                 check is what stops the sliders rendering with nothing to
                 drive. -->
            {#if selection.length > 0 && selection.every((s) => isSizable(s))}
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
                <Labeled
                    label={(l) => l.ui.page.character.field.closed}
                    fixed={PaletteLabelWidth}
                >
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
                    ></Checkbox>
                </Labeled>
            {/if}
        {/if}
        {#if mode === DrawingMode.Image}
            <ImageImporter
                add={(pixels, crop) => {
                    setPixelLayer(pixels);
                    showCanvas();
                    announceEdit(
                        'character-edit',
                        $locales
                            .concretize(
                                (l) => l.ui.page.character.announce.imported,
                                { count: pixels.length, x: crop.x, y: crop.y },
                            )
                            .toText(),
                    );
                }}
                announce={(message) => announceEdit('character-point', message)}
            />
        {/if}
        {#if mode === DrawingMode.Symbol}
            <!-- One tool for letters, symbols and emoji, added either way. The
                 chooser can only return a single character, so there is nothing
                 to validate and no message to write for an invalid one. -->
            <!-- Labeled, not hand-rolled <label>s: it carries the spacing
                 between a label and its widget, puts the label first the way
                 every other row does, and a shared width lines the widgets up
                 with each other. Mode draws its own label at its own width, so
                 it hands that job over here to line up with the rows below. -->
            <Labeled
                label={(l) => l.ui.page.character.field.insertion.label}
                fixed={PaletteLabelWidth}
            >
                <Mode
                    modes={(l) => l.ui.page.character.field.insertion}
                    icons={['■', '◌']}
                    choice={currentInsertion === 'pixels' ? 0 : 1}
                    select={(choice) =>
                        (currentInsertion =
                            choice === 0 ? 'pixels' : 'outline')}
                    labeled={false}
                ></Mode>
            </Labeled>
            <Labeled
                label={(l) => l.ui.page.character.field.face.label}
                fixed={PaletteLabelWidth}
            >
                <Options
                    value={currentFace}
                    label={(l) => l.ui.page.character.field.face.label}
                    id="character-face"
                    width="10em"
                    options={faceOptions}
                    change={(value) => (currentFace = value ?? 'Noto Sans')}
                >
                    {#snippet item(option)}
                        <FaceName
                            name={option.value ?? ''}
                            face={option.face}
                        />
                    {/snippet}
                </Options>
            </Labeled>
            <Labeled
                label={(l) => l.ui.page.character.field.weight.label}
                fixed={PaletteLabelWidth}
            >
                <Options
                    value={`${currentWeight}`}
                    label={(l) => l.ui.page.character.field.weight.label}
                    id="character-weight"
                    width="6em"
                    options={weightOptions}
                    change={(value) => (currentWeight = toFontWeight(value))}
                ></Options>
            </Labeled>
            <Labeled
                label={(l) => l.ui.page.character.field.italic}
                fixed={PaletteLabelWidth}
            >
                <Checkbox
                    id="character-italic"
                    on={currentItalic}
                    label={(l) => l.ui.page.character.field.italic}
                    changed={(value) => (currentItalic = value === true)}
                ></Checkbox>
            </Labeled>
            {#if currentInsertion === 'outline'}
                <Slider
                    label={(l) => l.ui.page.character.field.glyphSize.label}
                    tip={(l) => l.ui.page.character.field.glyphSize.tip}
                    min={4}
                    max={CharacterSize}
                    increment={1}
                    precision={0}
                    unit={''}
                    bind:value={currentGlyphSize}
                ></Slider>
            {/if}
            {#if glyphLoading}
                <Spinning
                    label={(l) => l.ui.page.character.feedback.glyphLoading}
                ></Spinning>
            {:else if glyphProblem !== undefined}
                <Notice text={glyphProblemText(glyphProblem)} />
            {/if}
            <EmojiChooser
                showCustom={false}
                pick={(symbol) => {
                    currentSymbol = symbol;
                    if (currentInsertion === 'pixels')
                        importSymbolAsPixels(symbol);
                    else void importSymbolAsOutline(symbol);
                }}
                glyph={currentSymbol ?? '🙂'}
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
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="toolbar" onfocusout={handleToolbarFocusOut}>
        {#each visibleCommands as command (command.id)}
            <Button
                tip={command.tip}
                label={command.label}
                icon={command.icon}
                action={command.action}
                active={command.active}
            />
        {/each}
    </div>

    <style>
        .toolbar {
            display: flex;
            flex-direction: column;
            flex-wrap: wrap;
            align-items: end;
            gap: var(--wordplay-spacing);
        }
    </style>
{/snippet}

{#snippet metaPreview()}
    <div class="preview">
        {#if editedCharacter}
            {@html characterToSVG(editedCharacter, '32px')}
        {/if}
    </div>
{/snippet}

{#snippet metaName()}
    <h1 style:z-index="2" style:margin="0">
        <TextField
            id="character-name"
            bind:text={name}
            placeholder={(l) => l.ui.page.character.field.name.placeholder}
            description={(l) => l.ui.page.character.field.name.description}
            validator={isValidName}
            max="8em"
            maxlength={MAX_NAME_LENGTH}
        ></TextField>
    </h1>
{/snippet}

{#snippet metaPhrase()}
    <RootView
        node={toProgram(
            `${Basis.getLocalizedBasis($locales).shares.output.Phrase.names.getNames()[0]}(\`@${Creator.getUsername($user?.email ?? '')}/${name}\`)`,
        )}
        blocks={false}
    />
{/snippet}

{#snippet metaDescription()}
    <TextBox
        id="character-description"
        bind:text={description}
        maxrows={3}
        maxlength={MAX_DESCRIPTION_LENGTH}
        placeholder={(l) => l.ui.page.character.field.description.placeholder}
        description={(l) => l.ui.page.character.field.description.description}
        validator={isValidDescription}
    ></TextBox>
{/snippet}

{#snippet metaShare()}
    <Dialog
        id="character-share"
        header={(l) => l.ui.page.character.share.dialog.header}
        explanation={(l) => l.ui.page.character.share.dialog.explanation}
        button={{
            background: true,
            tip: (l) => l.ui.page.character.share.button.tip,
            icon: isPublic ? GLOBE1_SYMBOL : '🤫',
            label: isPublic
                ? (l) => l.ui.page.character.share.public.labels[0]
                : (l) => l.ui.page.character.share.public.labels[1],
        }}
    >
        <Mode
            modes={(l) => l.ui.page.character.share.public}
            choice={isPublic ? 0 : 1}
            select={(mode) => (isPublic = mode === 0)}
            icons={[GLOBE1_SYMBOL, '🤫']}
        />
        <Labeled label={(l) => l.ui.page.character.share.collaborators}>
            <CreatorList
                uids={collaborators}
                editable
                anonymize={false}
                add={(userID) => (collaborators = [...collaborators, userID])}
                remove={(userID) =>
                    (collaborators = collaborators.filter((c) => c !== userID))}
                removable={() => true}
            />
        </Labeled>
    </Dialog>
{/snippet}

{#snippet metaDelete()}
    {#if isAuthenticated($user) && editedCharacter !== null && $user.uid === editedCharacter.owner}
        <ConfirmButton
            tip={(l) => l.ui.page.character.share.delete.tip}
            action={async () => {
                if (
                    editedCharacter &&
                    (await CharactersDB.deleteCharacter(editedCharacter.id))
                )
                    localeGoto('/characters');
            }}
            prompt={(l) => l.ui.page.character.share.delete.tip}
            enabled={editedCharacter !== null && !$disconnected}
            >{CANCEL_SYMBOL}
            <LocalizedText
                path={(l) => l.ui.page.character.share.delete.label}
            /></ConfirmButton
        >
    {/if}
{/snippet}

<svelte:body onpointerup={handlePointerUp} />

<Page>
    <section>
        <PageHeaderRow header={(l) => l.ui.page.character.header}>
            {#snippet controls()}
                {#if loaded}
                    <!-- The character's identity, as an overflow toolbar rather
                         than a wrapping row: on a phone the name, description
                         and share controls wrapped into a stack that pushed the
                         canvas off the screen. The preview is pinned so the
                         character is always in sight, and the description —
                         the widest and least urgent of these — is the first to
                         fold into the hamburger. -->
                    <OverflowToolbar
                        pinnedStart={[metaPreview]}
                        items={[metaName, metaPhrase, metaDescription]}
                        pinned={[metaShare, metaDelete]}
                    />
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

            <div class="editor" bind:this={editorView}>
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
                                style:left="{(100 * cursorBrush.left) /
                                    CharacterSize}%"
                                style:top="{(100 * cursorBrush.top) /
                                    CharacterSize}%"
                                style:width="{(100 * cursorBrush.size) /
                                    CharacterSize}%"
                                style:height="{(100 * cursorBrush.size) /
                                    CharacterSize}%"
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
        /* The editor lays itself out against this, not the viewport, so it
           stacks the same whether the window is narrow or the page is. */
        container-type: inline-size;
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

    /* The instructions are reference text, read once per tool and then ignored;
       at body size they pushed the color and size controls below the fold. */
    #instructions {
        font-size: var(--wordplay-small-font-size);
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

    .rect,
    .ellipse,
    .path,
    .pixel,
    .eraser {
        cursor: crosshair;
    }

    .notes {
        position: absolute;
        top: -2em;
        left: var(--wordplay-spacing);
        right: var(--wordplay-spacing);
        z-index: 2;
    }
    /* Narrow: three columns become one, in the order they're used — draw on
       the character, reach for a command, then set what the next stroke looks
       like. Three columns at phone width were about 100px each, which is
       neither a usable canvas nor a usable palette.

       Keep NARROW_THRESHOLD_PX in the script in sync with this. */
    @container (max-width: 700px) {
        .editor {
            flex-direction: column;
            align-items: stretch;
        }

        .content {
            order: 1;
            /* Start, like main's own alignment: centering inset the canvas
               further than the palette below it. */
            align-items: start;
        }

        .toolbar {
            order: 2;
            flex-direction: row;
            flex-wrap: wrap;
            align-items: center;
            justify-content: center;
        }

        .palette {
            order: 3;
            /* Fill the column rather than the 40vw that made sense beside two
               other columns. */
            width: 100%;
            /* And let the color choosers fill it too, rather than keeping the
               12em ceiling that suits a column beside two others. */
            --color-chooser-max-width: none;
        }

        .canvas {
            /* All of the column, not 90% of it: section's padding is the page's
               standard inset, and taking a further 5% a side made the canvas sit
               in from everything stacked below it. */
            width: min(100%, 60vh);
            height: min(100%, 60vh);
        }
    }
</style>
