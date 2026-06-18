import Caret from '@edit/caret/Caret';
import Node from '@nodes/Node';
import {
    BORROW_SYMBOL,
    CHANGE_SYMBOL,
    CONVERT_SYMBOL,
    COPY_SYMBOL,
    CUT_SYMBOL,
    DEGREE_SYMBOL,
    DOCS_SYMBOL,
    DOCUMENTATION_SYMBOL,
    DOT_SYMBOL,
    EDIT_SYMBOL,
    ELISION_SYMBOL,
    FALSE_SYMBOL,
    FUNCTION_SYMBOL,
    NONE_SYMBOL,
    PALETTE_SYMBOL,
    PASTE_SYMBOL,
    PREVIOUS_SYMBOL,
    PRODUCT_SYMBOL,
    QUOTIENT_SYMBOL,
    REDO_SYMBOL,
    SELECTION_SYMBOL,
    SHARE_SYMBOL,
    SOURCE_SYMBOL,
    STAGE_SYMBOL,
    STREAM_SYMBOL,
    TABLE_CLOSE_SYMBOL,
    TABLE_OPEN_SYMBOL,
    PATTERN_DELIMITER_SYMBOL,
    MATCH_SEARCH_SYMBOL,
    PATTERN_ANY_SYMBOL,
    PATTERN_SPACE_SYMBOL,
    PATTERN_START_SYMBOL,
    PATTERN_END_SYMBOL,
    PATTERN_FOLD_SYMBOL,
    PATTERN_AHEAD_SYMBOL,
    PATTERN_BEHIND_SYMBOL,
    PATTERN_WORD_SYMBOL,
    PATTERN_WORDEDGE_SYMBOL,
    THIS_SYMBOL,
    TRANSLATE_SYMBOL,
    TRUE_SYMBOL,
    TYPE_SYMBOL,
    UNDO_SYMBOL,
} from '@parser/Symbols';

import { moveVisualVertical } from '@components/editor/caret/CaretView.svelte';
import {
    copyNode,
    toClipboard,
    WORDPLAY_CLIPBOARD_FORMAT,
} from '@components/editor/commands/Clipboard';
import { wasCopiedHere } from '@components/editor/commands/InternalClipboard';
import interpret from '@components/editor/commands/interpret';
import type { EditorNotifier } from '@components/editor/EditorNotification';
import { pasteText } from '@components/editor/Paste';
import {
    expandCaretVisualVertical,
    moveCaretVisualVertical,
} from '@components/editor/pointer/PointerUtilities';
import {
    isNodeHidden,
    renderedTokenIds,
    skipHiddenIndex,
} from '@components/editor/util/foldedCaret';
import {
    FOLD_GLYPH,
    FOLD_GLYPH_ROTATION,
} from '@components/editor/util/folding';
import { TileKind } from '@components/project/TileKind';
import { Settings, type Database } from '@db/Database';
import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import type { LocaleTextAccessor } from '@locale/Locales';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import FunctionDefinition from '@nodes/FunctionDefinition';
import Names from '@nodes/Names';
import Source from '@nodes/Source';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import { TAB_SYMBOL } from '@parser/Spaces';
import type Evaluator from '@runtime/Evaluator';

export type Command = {
    /** The iconographic text symbol to use */
    symbol: string;
    /** Degrees to rotate the rendered symbol, for reusing one glyph at different
     *  orientations so related toolbar icons stay visually consistent (e.g. the
     *  fold/unfold chevron). Omit for no rotation. */
    symbolRotation?: number;
    /** Gets the locale string from a locale for use in title and aria-label of UI  */
    description: LocaleTextAccessor;
    /** True if it should be a control in the toolbar */
    visible: Visibility;
    /** The category of command, used to decide where to display controls if visible */
    category: Category;
    /** If true, the command is always visible and not hidden behind an accordion */
    important?: boolean;
    /** The key that triggers the command. If omitted, the command has no keyboard
     *  shortcut — UNLESS it's also a `typing` catch-all (e.g. InsertSymbol), in
     *  which case every key triggers it. Palette-only commands omit both. */
    key?: string;
    /** The optional symbol representing the key, for rendering shortcuts */
    keySymbol?: string;
    /** If true, shift is required, if false, it's disqualifying, if undefined, it can be either */
    shift: boolean | undefined;
    /** If true, alt is required, if false, it's disqualifying, if undefined, it can be either */
    alt: boolean | undefined;
    /** If true, control or meta is required, if false, it's disqualifying, if undefined, it can be either */
    control: boolean | undefined;
    /** If true, indicates that the command is likely to be invoked in a flurry. See KeyboardActivity. */
    typing?: boolean | undefined;
    /** An UI to place on buttons corresponding to this command for tutorial highlighting */
    uiid?: string;
    /** A function that should indicate whether the command is active. If undefined, it's not executed, but the keystroke is consumed. */
    active?: (context: CommandContext, key: string) => boolean | undefined;
    /** Generates an edit or other editor command */
    execute: (context: CommandContext, key: string) => CommandResult;
};

/** Different responses that commands can produce. */
type CommandResult =
    // An edit to a source file
    | Edit
    // An edit to a whole project
    | ProjectRevision
    // An eventual edit to a source file or project
    | Promise<Edit | ProjectRevision | true | LocaleTextAccessor>
    // Handled, but no side effect
    | true
    // Not handled
    | false
    // Not handled for a reason that should be communicated.
    | LocaleTextAccessor;

export type CommandContext = {
    /** The caret for the focused editor */
    caret: Caret | undefined;
    /** Whether an editor is handling this event */
    editor: boolean;
    /** The project we're editing */
    project: Project;
    /** The locales currently selected */
    locales: Locales;
    /** The evalutor currently evaluating the project */
    evaluator: Evaluator;
    database: Database;
    dragging: boolean;
    /** Whether blocks mode is one */
    blocks: boolean;
    /** The HTMLElement rendering the editor */
    view: HTMLElement | undefined;
    toggleMenu?: () => void;
    /** Toggle the focused editor's search field. */
    toggleSearch?: () => void;
    /** Move the caret to the next search match, cycling back to the first.
     *  Returns true if it was handled (consuming the keystroke). */
    nextSearchMatch?: () => boolean;
    /** Fold / unfold every foldable node in the focused editor. */
    foldAll?: (() => void) | undefined;
    unfoldAll?: (() => void) | undefined;
    /** Whether there's anything left to fold / unfold (drives the toolbar
     *  buttons' active state and consumes the shortcut only when useful). */
    canFoldAll?: (() => boolean) | undefined;
    canUnfoldAll?: (() => boolean) | undefined;
    /** The set of nodes currently rendered folded, so caret movement can skip
     *  over a collapsed node's hidden body instead of wandering into it. */
    folded?: Set<Node> | undefined;
    toggleBlocks?: (on: boolean) => void;
    setFullscreen?: (on: boolean) => void;
    focusOrCycleTile?: (content?: TileKind) => void;
    resetInputs?: () => void;
    help?: () => void;
    getTokenViews?: () => HTMLElement[];
    /** Function to clear large deletion notification */
    clearLargeDeletionNotification?: () => void;
    /** The focused editor's footer notification controller */
    notify?: EditorNotifier | undefined;
    /** The editor zoom level */
    zoom: number | undefined;
    setZoom?: undefined | ((z: number) => void);
};

export type Edit = Caret | Revision;
export type Revision = [Source, Caret];
export type ProjectRevision = [Project, Caret];

export const Visibility = {
    Visible: 'visible',
    Touch: 'touch',
    Invisible: 'invisible ',
} as const;
export type Visibility = (typeof Visibility)[keyof typeof Visibility];

export const Category = {
    Cursor: 'cursor',
    Insert: 'insert',
    Modify: 'modify',
    Evaluate: 'evaluate',
    Help: 'help',
    Fallback: 'fallback',
} as const;
export type Category = (typeof Category)[keyof typeof Category];

/** Whether the current device uses macOS/iOS modifier-key conventions, which
 *  label modifiers with symbols rather than words. */
export function onMacOS() {
    return (
        typeof navigator !== 'undefined' &&
        navigator.userAgent.indexOf('Mac') !== -1
    );
}

/** Platform-specific labels for the modifier keys, reused wherever we summarize a
 *  keyboard shortcut (toShortcut and in-editor instructions like the Tab notice). */
export function controlKeyLabel() {
    return onMacOS() ? '⌘' : 'Ctrl';
}
export function altKeyLabel() {
    return onMacOS() ? '⎇' : 'Alt';
}
export function shiftKeyLabel() {
    return onMacOS() ? '⇧' : 'Shift';
}

export function toShortcut(
    command: {
        control: boolean | undefined;
        alt: boolean | undefined;
        shift: boolean | undefined;
        key?: string;
        keySymbol?: string;
    },
    hideControl = false,
    hideShift = false,
    hideAlt = false,
) {
    const mac = onMacOS();
    return `${command.control && !hideControl ? (mac ? controlKeyLabel() : controlKeyLabel() + '+') : ''}${
        command.alt && !hideAlt
            ? mac
                ? altKeyLabel()
                : altKeyLabel() + ' + '
            : ''
    }${command.shift && !hideShift ? (mac ? shiftKeyLabel() : shiftKeyLabel() + ' + ') : ''}${
        command.keySymbol ?? command.key ?? '-'
    }`;
}

export function handleKeyCommand(
    event: KeyboardEvent,
    context: CommandContext,
): [Command | undefined, CommandResult, boolean] {
    // Map meta key to control on Mac OS/iOS.
    const control = event.metaKey || event.ctrlKey;

    let matchedShortcut = false;

    // Loop through the commands and see if there's a match to this event.
    for (const command of Commands) {
        // Does this command's shortcut pattern match the event?
        if (
            (command.control === undefined || command.control === control) &&
            (command.shift === undefined || command.shift === event.shiftKey) &&
            (command.alt === undefined || command.alt === event.altKey) &&
            // A command with no `key` is a keyboard wildcard ONLY when it's a
            // `typing` catch-all (e.g. InsertSymbol, which inserts the typed
            // character). Palette-only commands (visible toolbar inserts with no
            // shortcut, like the pattern glyphs) deliberately omit `key`; without
            // this guard they'd match every unmodified keystroke and clobber it.
            ((command.key === undefined && command.typing === true) ||
                command.key === event.code ||
                command.key === event.key)
        ) {
            // Update matched shortcut to true, since we matched one.
            // The only one that doesn't count is the insert symbol catch all.
            if (command !== InsertSymbol) matchedShortcut = true;

            // Is the command active? If so, execute it.
            const isActive =
                command.active === undefined ||
                command.active(context, event.key);

            if (isActive) {
                // If so, execute it.
                const result = command.execute(context, event.key);
                if (result !== false) return [command, result, true];
            } else if (matchedShortcut && isActive === null)
                return [command, true, true];
        }
    }
    // Didn't execute? Return false if we didn't match anything and let the shortcut travel to the browser.
    // If we did match something, return undefined, so we consume the shortcut and don't default to a browser shortcut.
    return [undefined, false, matchedShortcut];
}

/** Before committing a command's caret result, reset the visual goal column
 *  unless the command was one of the VerticalMovementCommands (identified by
 *  reference, not a key string). This way every horizontal or other caret move —
 *  left/right, home/end, and even no-op moves at a boundary that return the caret
 *  unchanged — updates the goal column, while the vertical commands keep it.
 *  Applied at every dispatch site (keyboard and command buttons), so the rule
 *  holds regardless of how the command was triggered. Non-Caret results (edits)
 *  are returned unchanged; they build their own caret with the column reset. */
export function resetVisualColumnAfter(
    command: Command | undefined,
    result: Edit | ProjectRevision | LocaleTextAccessor,
): Edit | ProjectRevision | LocaleTextAccessor {
    const verticalMove =
        command !== undefined && VerticalMovementCommands.includes(command);
    return result instanceof Caret && !verticalMove
        ? result.withoutVisualColumn()
        : result;
}

function handleInsert(context: CommandContext, symbol: string) {
    if (context.caret)
        return (
            context.caret.insert(symbol, context.blocks, context.project) ??
            false
        );
    else return false;
}

/** Keep horizontal caret movement (and selection) out of a folded node's hidden
 *  body while leaving its visible tokens fully navigable: step through rendered
 *  tokens as normal, but when a move lands on a collapsed (non-rendered) token,
 *  skip past the whole hidden run. In blocks mode a selection that lands on a
 *  hidden descendant of a fold collapses to the fold itself. */
function skipFolded(
    result: Caret | LocaleTextAccessor,
    direction: -1 | 1,
    folded: Set<Node> | undefined,
    getTokenViews: (() => HTMLElement[]) | undefined,
): Caret | LocaleTextAccessor {
    if (
        !(result instanceof Caret) ||
        folded === undefined ||
        folded.size === 0 ||
        getTokenViews === undefined
    )
        return result;
    const source = result.source;
    const pos = result.position;

    const rendered = renderedTokenIds(getTokenViews);

    // Node selection (e.g. blocks-mode movement, or a token boundary in text
    // mode): only redirect when the node is itself collapsed out of view — none
    // of its tokens are rendered. A visible node inside a folded node's header
    // or docs (e.g. a doc's markup) stays selectable and navigable as normal.
    if (pos instanceof Node) {
        if (isNodeHidden(pos, rendered))
            for (const node of folded)
                if (node !== pos && node.contains(pos))
                    return result.withPosition(node);
        return result;
    }

    if (typeof pos === 'number') {
        const next = skipHiddenIndex(source, pos, direction, rendered);
        return next === pos ? result : result.withPosition(next);
    }
    // Range selection: move only the active (second) end past hidden tokens.
    if (Array.isArray(pos)) {
        const next = skipHiddenIndex(source, pos[1], direction, rendered);
        return next === pos[1] ? result : result.withPosition([pos[0], next]);
    }
    return result;
}

export const ShowKeyboardHelp: Command = {
    uiid: 'showKeyboardHelp',
    symbol: '⌨️',
    description: (l) => l.ui.project.help,
    visible: Visibility.Invisible,
    category: Category.Help,
    shift: false,
    alt: false,
    control: true,
    key: 'Slash',
    keySymbol: '?',
    execute: ({ help }) => {
        if (help) {
            help();
            return true;
        } else return false;
    },
};

export const ToggleSearch: Command = {
    symbol: '🔍',
    description: (l) => l.ui.source.field.search,
    visible: Visibility.Invisible,
    category: Category.Cursor,
    shift: false,
    alt: false,
    control: true,
    key: 'KeyF',
    keySymbol: 'F',
    // When an editor is handling this, consume Cmd/Ctrl+F (overriding the
    // browser's find shortcut) and toggle the editor's search field. Returns
    // false when no editor provides toggleSearch, so the browser shortcut still
    // works when no editor is focused.
    execute: ({ toggleSearch }) => {
        if (toggleSearch) {
            toggleSearch();
            return true;
        } else return false;
    },
};

export const GoToNextMatch: Command = {
    symbol: '🔍',
    description: (l) => l.ui.source.cursor.nextMatch,
    visible: Visibility.Invisible,
    category: Category.Cursor,
    shift: false,
    alt: false,
    control: true,
    key: 'KeyG',
    keySymbol: 'G',
    // Move to the next match (overriding the browser's find-next) when an
    // editor is searching. Returns false otherwise so the browser shortcut
    // still works when no editor is searching.
    execute: ({ nextSearchMatch }) => nextSearchMatch?.() ?? false,
};

export const IncrementLiteral: Command = {
    uiid: 'incrementLiteral',
    symbol: '+',
    description: (l) => l.ui.source.cursor.incrementLiteral,
    visible: Visibility.Touch,
    category: Category.Modify,
    control: false,
    alt: true,
    shift: false,
    key: 'ArrowUp',
    keySymbol: '↑',
    active: ({ caret }) =>
        caret ? caret.getAdjustableLiteral() !== undefined : false,
    execute: ({ caret }) => caret?.adjustLiteral(undefined, 1) ?? false,
};

export const DecrementLiteral: Command = {
    uiid: 'decrementLiteral',
    symbol: '–',
    description: (l) => l.ui.source.cursor.decrementLiteral,
    visible: Visibility.Touch,
    category: Category.Modify,
    shift: false,
    control: false,
    alt: true,
    key: 'ArrowDown',
    keySymbol: '↓',
    active: ({ caret }) =>
        caret ? caret.getAdjustableLiteral() !== undefined : false,
    execute: ({ caret }) => caret?.adjustLiteral(undefined, -1) ?? false,
};

export const StepBack: Command = {
    uiid: 'stepBack',
    symbol: '←',
    description: (l) => l.ui.timeline.button.backStep,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'ArrowLeft',
    keySymbol: '←',
    // If we don't consume this, the browser will go back, which is annoying.
    // active: (context) =>
    //     !context.evaluator.isAtBeginning() ? true : undefined,
    execute: (context) => {
        context.evaluator.stepBackWithinProgram();
        return true;
    },
};

export const StepForward: Command = {
    uiid: 'stepForward',
    symbol: '→',
    description: (l) => l.ui.timeline.button.forwardStep,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'ArrowRight',
    keySymbol: '→',
    active: (context) =>
        context.evaluator.isInPast() &&
        context.evaluator.getStepIndex() !== undefined &&
        context.evaluator.getStepIndex() < context.evaluator.getStepCount()
            ? true
            : undefined,
    execute: (context) => context.evaluator.stepWithinProgram(),
};

export const StepBackInput: Command = {
    uiid: 'stepBackInput',
    symbol: '⇠',
    description: (l) => l.ui.timeline.button.backInput,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: true,
    alt: false,
    control: true,
    key: 'ArrowLeft',
    keySymbol: '←',
    active: (context) =>
        !context.evaluator.isAtBeginning() ? true : undefined,
    execute: (context) => context.evaluator.stepBackToInput(),
};

export const StepForwardInput: Command = {
    uiid: 'stepForwardInput',
    symbol: '⇢',
    description: (l) => l.ui.timeline.button.forwardInput,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: true,
    alt: false,
    control: true,
    key: 'ArrowRight',
    keySymbol: '→',
    active: (context) => (context.evaluator.isInPast() ? true : undefined),
    execute: (context) => context.evaluator.stepToInput(),
};

export const StepBackNode: Command = {
    uiid: 'stepBackNode',
    symbol: '•←',
    description: (l) => l.ui.timeline.button.backNode,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: true,
    alt: true,
    control: true,
    key: 'ArrowLeft',
    keySymbol: '←',
    active: ({ caret }) => caret !== undefined,
    execute: ({ caret, evaluator }) => {
        const target = caret?.getExpressionAt();
        if (target) {
            evaluator.stepBackToNode(target);
            return true;
        }
        return false;
    },
};

export const StepForwardNode: Command = {
    uiid: 'stepForwardNode',
    symbol: '⇢•',
    description: (l) => l.ui.timeline.button.forwardNode,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    key: 'ArrowRight',
    keySymbol: '→',
    shift: true,
    alt: true,
    control: true,
    active: ({ caret }) => caret !== undefined,
    execute: ({ caret, evaluator }) => {
        const target = caret?.getExpressionAt();
        if (target) {
            evaluator.stepToNode(target);
            return true;
        } else return false;
    },
};

export const Restart: Command = {
    symbol: '↻',
    description: (l) => l.ui.timeline.button.reset,
    uiid: 'resetEvaluator',
    visible: Visibility.Visible,
    category: Category.Evaluate,
    key: 'Enter',
    shift: true,
    alt: false,
    control: true,
    execute: ({ resetInputs }) => {
        // Don't handle this if we don't have access to the reset function.
        if (resetInputs === undefined) return false;
        // Reset the project's inputs.
        resetInputs();
        return true;
    },
};

export const StepToStart: Command = {
    uiid: 'stepToStart',
    symbol: '⇤',
    description: (l) => l.ui.timeline.button.start,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'Home',
    active: (context) =>
        !context.evaluator.isAtBeginning() ? true : undefined,
    execute: (context) => {
        context.evaluator.stepTo(0);
        return true;
    },
};

export const StepToPresent: Command = {
    uiid: 'stepToPresent',
    symbol: '⇥',
    description: (l) => l.ui.timeline.button.present,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'End',
    active: (context) => (context.evaluator.isInPast() ? true : undefined),
    execute: (context) => {
        context.evaluator.stepToEnd();
        return true;
    },
};

export const StepOut: Command = {
    uiid: 'stepOut',
    symbol: '↑',
    description: (l) => l.ui.timeline.button.out,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'ArrowUp',
    keySymbol: '↑',
    active: (context) =>
        context.evaluator.isPlaying() &&
        context.evaluator.getCurrentStep() !== undefined &&
        context.evaluator.getCurrentEvaluation() !== undefined
            ? true
            : undefined,
    execute: (context) => {
        context.evaluator.stepOut();
        return true;
    },
};

export const Play: Command = {
    uiid: 'play',
    symbol: '▶',
    description: (l) => l.ui.timeline.button.play,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'Enter',
    active: (context) => (!context.evaluator.isPlaying() ? true : undefined),
    execute: (context) => {
        context.evaluator.play();
        return true;
    },
};

export const Pause: Command = {
    uiid: 'pause',
    symbol: '⏸',
    description: (l) => l.ui.timeline.button.pause,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'Enter',
    active: (context) => (context.evaluator.isPlaying() ? true : undefined),
    execute: (context) => {
        context.evaluator.pause();
        return true;
    },
};

export const ShowMenu: Command = {
    uiid: 'showMenu',
    symbol: '▾',
    description: (l) => l.ui.source.menu.show,
    visible: Visibility.Visible,
    category: Category.Modify,
    shift: false,
    alt: false,
    control: true,
    key: 'ArrowDown',
    keySymbol: '↓',
    execute: ({ toggleMenu }) => {
        if (toggleMenu) {
            toggleMenu();
            return true;
        } else return false;
    },
};

export const EnterFullscreen: Command = {
    uiid: 'enterFullscreen',
    symbol: '▶',
    description: (l) => l.ui.tile.toggle.fullscreen.off,
    visible: Visibility.Invisible,
    category: Category.Evaluate,
    shift: false,
    alt: true,
    control: true,
    key: 'Enter',
    execute: ({ setFullscreen }) => {
        if (setFullscreen) {
            setFullscreen(true);
            return true;
        } else return false;
    },
};

export const ExitFullscreen: Command = {
    uiid: 'exitFullscreen',
    symbol: EDIT_SYMBOL,
    description: (l) => l.ui.tile.toggle.fullscreen.on,
    visible: Visibility.Invisible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: false,
    key: 'Escape',
    execute: ({ setFullscreen, dragging }) => {
        if (dragging || setFullscreen === undefined) return false;
        else {
            setFullscreen(false);
            return true;
        }
    },
};

export const FocusOutput: Command = {
    uiid: 'focusOutput',
    symbol: STAGE_SYMBOL,
    description: (l) => l.ui.project.button.focusOutput,
    visible: Visibility.Invisible,
    category: Category.Cursor,
    shift: false,
    alt: true,
    control: true,
    key: 'Digit1',
    execute: ({ focusOrCycleTile }) => {
        if (focusOrCycleTile) {
            focusOrCycleTile(TileKind.Output);
            return true;
        } else return false;
    },
};

export const FocusSource: Command = {
    uiid: 'focusSource',
    symbol: SOURCE_SYMBOL,
    description: (l) => l.ui.project.button.focusSource,
    visible: Visibility.Invisible,
    category: Category.Cursor,
    shift: false,
    alt: true,
    control: true,
    key: 'Digit2',
    execute: ({ focusOrCycleTile }) => {
        if (focusOrCycleTile) {
            focusOrCycleTile(TileKind.Source);
            return true;
        }
        return false;
    },
};

export const FocusDocs: Command = {
    uiid: 'focusDocs',
    symbol: DOCUMENTATION_SYMBOL,
    description: (l) => l.ui.project.button.focusDocs,
    visible: Visibility.Invisible,
    category: Category.Cursor,
    shift: false,
    alt: true,
    control: true,
    key: 'Digit3',
    execute: ({ focusOrCycleTile }) => {
        if (focusOrCycleTile) {
            focusOrCycleTile(TileKind.Documentation);
            return true;
        }
        return false;
    },
};

export const FocusPalette: Command = {
    uiid: 'focusPalette',
    symbol: PALETTE_SYMBOL,
    description: (l) => l.ui.project.button.focusPalette,
    visible: Visibility.Invisible,
    category: Category.Cursor,
    shift: false,
    alt: true,
    control: true,
    key: 'Digit4',
    execute: ({ focusOrCycleTile }) => {
        if (focusOrCycleTile) {
            focusOrCycleTile(TileKind.Palette);
            return true;
        }
        return false;
    },
};

export const FocusCycle: Command = {
    symbol: '💬',
    description: (l) => l.ui.project.button.focusCycle,
    visible: Visibility.Invisible,
    category: Category.Cursor,
    shift: false,
    alt: true,
    control: true,
    key: 'Digit0',
    execute: ({ focusOrCycleTile }) => {
        if (focusOrCycleTile) {
            focusOrCycleTile();
            return true;
        }
        return false;
    },
};

export const ToggleBlocks: Command = {
    symbol: '⧠',
    description: (l) => l.ui.source.toggle.blocks.on,
    visible: Visibility.Invisible,
    category: Category.Modify,
    shift: false,
    alt: false,
    control: true,
    key: 'Backslash',
    important: true,
    execute: ({ toggleBlocks }) => {
        if (toggleBlocks) {
            toggleBlocks(!Settings.getBlocks());
            return true;
        }
        return false;
    },
};

export const FoldAll: Command = {
    // The fold chevron rotated to point down (collapse all) — the same glyph as
    // unfold-all and the inline toggle, just reoriented, so the toolbar reads
    // consistently. Distinct from the filled ▾ menu trigger.
    symbol: FOLD_GLYPH,
    symbolRotation: FOLD_GLYPH_ROTATION,
    description: (l) => l.ui.source.fold.all,
    visible: Visibility.Visible,
    category: Category.Modify,
    shift: true,
    alt: false,
    control: true,
    // ⌘/Ctrl+Shift+< (the comma key). Avoids the bracket keys, which browsers
    // bind to history navigation.
    key: 'Comma',
    keySymbol: '<',
    important: true,
    active: ({ canFoldAll }) => canFoldAll?.() ?? false,
    execute: ({ foldAll }) => {
        if (foldAll) {
            foldAll();
            return true;
        }
        return false;
    },
};

export const UnfoldAll: Command = {
    // Right chevron (expand all) — mirrors the inline fold toggle's collapsed
    // state.
    symbol: FOLD_GLYPH,
    description: (l) => l.ui.source.fold.none,
    visible: Visibility.Visible,
    category: Category.Modify,
    shift: true,
    alt: false,
    control: true,
    // ⌘/Ctrl+Shift+> (the period key).
    key: 'Period',
    keySymbol: '>',
    important: true,
    active: ({ canUnfoldAll }) => canUnfoldAll?.() ?? false,
    execute: ({ unfoldAll }) => {
        if (unfoldAll) {
            unfoldAll();
            return true;
        }
        return false;
    },
};

/** The command to rule them all... inserts things during text editing mode. */

export const InsertSymbol: Command = {
    symbol: 'a',
    description: (l) => l.ui.source.cursor.type,
    visible: Visibility.Invisible,
    category: Category.Fallback,
    control: false,
    shift: undefined,
    alt: false,
    typing: true,
    execute: ({ caret, project, editor, blocks }, key) => {
        if (editor && caret && key.length === 1)
            return caret.insert(key, blocks, project);
        else return false;
    },
};

export const Undo: Command = {
    symbol: UNDO_SYMBOL,
    description: (l) => l.ui.source.cursor.undo,
    visible: Visibility.Visible,
    category: Category.Modify,
    shift: false,
    control: true,
    alt: false,
    key: 'KeyZ',
    keySymbol: 'Z',
    important: true,
    active: ({ database, evaluator }) =>
        database.Projects.getHistory(
            evaluator.project.getID(),
        )?.isUndoable() === true
            ? true
            : undefined,
    execute: ({ database, evaluator, clearLargeDeletionNotification }) => {
        database.Projects.undoRedo(evaluator.project.getID(), -1);
        // Clear large deletion notification when user undoes
        clearLargeDeletionNotification?.();
        // Always swallow the shortcut to avoid the browser or OS from handling it.
        return true;
    },
};

export const Redo: Command = {
    symbol: REDO_SYMBOL,
    description: (l) => l.ui.source.cursor.redo,
    visible: Visibility.Visible,
    category: Category.Modify,
    shift: true,
    control: true,
    alt: false,
    key: 'KeyZ',
    keySymbol: 'Z',
    important: true,
    active: ({ evaluator, database }) =>
        database.Projects.getHistory(
            evaluator.project.getID(),
        )?.isRedoable() === true
            ? true
            : undefined,
    execute: ({ database, evaluator }) => {
        database.Projects.undoRedo(evaluator.project.getID(), 1);
        // Always swallow the shortcut to avoid the browser or OS from handling it.
        return true;
    },
};

// The vertical caret-movement commands are named so resetVisualColumnAfter can
// identify them by reference (they own the caret's visual goal column) rather
// than by matching fragile key strings. See VerticalMovementCommands below.

const MovePriorLine: Command = {
    symbol: '↑',
    description: (l) => l.ui.source.cursor.priorLine,
    visible: Visibility.Touch,
    category: Category.Cursor,
    alt: false,
    control: false,
    shift: false,
    key: 'ArrowUp',
    keySymbol: '↑',
    // Move one visual row up: between block tokens in blocks mode, or by the
    // rendered row in text mode (respects proportional glyphs, tabs, and
    // soft-wrapped rows). `?? true` swallows the event at the document edge.
    execute: ({ caret, blocks, view, getTokenViews, locales }) =>
        caret && view && getTokenViews
            ? blocks
                ? (moveVisualVertical(-1, view, caret, getTokenViews) ?? false)
                : (moveCaretVisualVertical(
                      -1,
                      view,
                      caret,
                      getTokenViews,
                      locales.getDirection() === 'rtl',
                  ) ?? true)
            : false,
};

const ExpandPriorLine: Command = {
    symbol: '↑☐',
    description: (l) => l.ui.source.cursor.expandPriorLine,
    visible: Visibility.Invisible,
    category: Category.Cursor,
    alt: false,
    control: false,
    shift: true,
    key: 'ArrowUp',
    keySymbol: '↑',
    // Expand the selection by one visual row up in text mode (matching
    // ArrowUp's movement). No vertical expansion in blocks mode.
    execute: ({ caret, blocks, view, getTokenViews, locales }) =>
        caret && view && getTokenViews
            ? blocks
                ? false
                : (expandCaretVisualVertical(
                      -1,
                      view,
                      caret,
                      getTokenViews,
                      locales.getDirection() === 'rtl',
                  ) ?? true)
            : false,
};

const MoveNextLine: Command = {
    symbol: '↓',
    description: (l) => l.ui.source.cursor.nextLine,
    visible: Visibility.Touch,
    category: Category.Cursor,
    alt: false,
    control: false,
    shift: false,
    key: 'ArrowDown',
    keySymbol: '↓',
    // Move one visual row down: between block tokens in blocks mode, or by the
    // rendered row in text mode (respects proportional glyphs, tabs, and
    // soft-wrapped rows). `?? true` swallows the event at the document edge.
    execute: ({ caret, blocks, view, getTokenViews, locales }) =>
        caret && view && getTokenViews
            ? blocks
                ? (moveVisualVertical(1, view, caret, getTokenViews) ?? false)
                : (moveCaretVisualVertical(
                      1,
                      view,
                      caret,
                      getTokenViews,
                      locales.getDirection() === 'rtl',
                  ) ?? true)
            : false,
};

const ExpandNextLine: Command = {
    symbol: '↓☐',
    description: (l) => l.ui.source.cursor.expandNextLine,
    visible: Visibility.Invisible,
    category: Category.Cursor,
    alt: false,
    control: false,
    shift: true,
    key: 'ArrowDown',
    keySymbol: '↓',
    // Expand the selection by one visual row down in text mode (matching
    // ArrowDown's movement). No vertical expansion in blocks mode.
    execute: ({ caret, blocks, view, getTokenViews, locales }) =>
        caret && view && getTokenViews
            ? blocks
                ? false
                : (expandCaretVisualVertical(
                      1,
                      view,
                      caret,
                      getTokenViews,
                      locales.getDirection() === 'rtl',
                  ) ?? true)
            : false,
};

/** The vertical caret-movement commands, which own the caret's visual goal
 *  column (set/preserved by moveCaretVisualVertical / expandCaretVisualVertical);
 *  every other command resets it. resetVisualColumnAfter checks membership here
 *  by reference, so the rule isn't tied to fragile key strings. */
const VerticalMovementCommands: Command[] = [
    MovePriorLine,
    ExpandPriorLine,
    MoveNextLine,
    ExpandNextLine,
];

const Commands: Command[] = [
    MovePriorLine,
    ExpandPriorLine,
    MoveNextLine,
    ExpandNextLine,
    {
        symbol: '←',
        description: (l) => l.ui.source.cursor.priorInline,
        visible: Visibility.Touch,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'ArrowLeft',
        keySymbol: '←',
        execute: ({ caret, database, blocks, folded, getTokenViews }) => {
            if (caret === undefined) return true;
            const direction: -1 | 1 = blocks
                ? -1
                : database.Locales.getWritingDirection() === 'ltr'
                  ? -1
                  : 1;
            return skipFolded(
                blocks
                    ? caret.moveInlineBlock(direction)
                    : caret.moveInlineText(false, direction),
                direction,
                folded,
                getTokenViews,
            );
        },
    },
    {
        symbol: '←☐',
        description: (l) => l.ui.source.cursor.expandBeforeInline,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: true,
        key: 'ArrowLeft',
        keySymbol: '←',
        execute: ({ caret, blocks, folded, getTokenViews }) =>
            caret
                ? blocks
                    ? false
                    : skipFolded(
                          caret.expandInline(-1),
                          -1,
                          folded,
                          getTokenViews,
                      )
                : false,
    },
    {
        symbol: '→',
        description: (l) => l.ui.source.cursor.nextInline,
        visible: Visibility.Touch,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'ArrowRight',
        keySymbol: '→',
        execute: ({ caret, database, blocks, folded, getTokenViews }) => {
            if (caret === undefined) return false;
            const direction: -1 | 1 = blocks
                ? 1
                : database.Locales.getWritingDirection() === 'ltr'
                  ? 1
                  : -1;
            return skipFolded(
                blocks
                    ? caret.moveInlineBlock(direction)
                    : caret.moveInlineText(false, direction),
                direction,
                folded,
                getTokenViews,
            );
        },
    },
    {
        symbol: '☐→',
        description: (l) => l.ui.source.cursor.expandAfterInline,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: true,
        key: 'ArrowRight',
        keySymbol: '→',
        execute: ({ caret, blocks, folded, getTokenViews }) =>
            caret
                ? blocks
                    ? false
                    : skipFolded(
                          caret.expandInline(1),
                          1,
                          folded,
                          getTokenViews,
                      )
                : false,
    },
    {
        symbol: '⇤',
        description: (l) => l.ui.source.cursor.lineStart,
        visible: Visibility.Touch,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'Home',
        keySymbol: '⇤',
        execute: ({ caret }) => caret?.atLineBoundary(true) ?? false,
    },
    {
        symbol: '⇥',
        description: (l) => l.ui.source.cursor.lineEnd,
        visible: Visibility.Touch,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'End',
        keySymbol: '⇥',
        execute: ({ caret }) => caret?.atLineBoundary(false) ?? false,
    },
    {
        symbol: '⤒',
        description: (l) => l.ui.source.cursor.sourceStart,
        visible: Visibility.Touch,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'PageUp',
        keySymbol: '',
        execute: ({ caret }) => caret?.atStart() ?? false,
    },
    {
        symbol: '⤓',
        description: (l) => l.ui.source.cursor.sourceEnd,
        visible: Visibility.Touch,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'PageDown',
        keySymbol: '⇥',
        execute: ({ caret }) => caret?.atEnd() ?? false,
    },
    {
        symbol: '⬉',
        description: (l) => l.ui.source.cursor.priorNode,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: false,
        shift: true,
        control: false,
        key: 'ArrowLeft',
        keySymbol: '←',
        execute: ({ caret }) => caret?.left(true) ?? false,
    },
    {
        symbol: '⬈',
        description: (l) => l.ui.source.cursor.nextNode,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: true,
        keySymbol: '→',
        key: 'ArrowRight',
        execute: ({ caret }) => caret?.right(true) ?? false,
    },
    {
        symbol: '↑',
        description: (l) => l.ui.source.cursor.parent,
        visible: Visibility.Visible,
        category: Category.Cursor,
        important: true,
        key: 'Escape',
        keySymbol: '␛',
        alt: undefined,
        control: false,
        shift: undefined,
        execute: ({ dragging, caret }) => {
            if (caret === undefined) return false;
            if (dragging) return false;
            const position = caret.position;
            if (position instanceof Node) {
                const parent = caret.source.root.getParent(position);
                if (parent && !(parent instanceof Source))
                    return caret.withPosition(parent).withEntry(undefined);
            }
            // Find the node corresponding to the position.
            // And if it's parent only has the one child, select it.
            else {
                let token =
                    (caret.atTokenEnd() && caret.hasSpaceAfter()) ||
                    caret.atEnd()
                        ? caret.tokenPrior
                        : caret.getToken();
                // Never select the program's end token (it's the last token in
                // the source, and at the end of the source tokenPrior can resolve
                // to it via its leading space). Instead consider the last token of
                // the program before the end token.
                const tokens = caret.source.tokens;
                if (token !== undefined && token === tokens[tokens.length - 1])
                    token =
                        tokens.length > 1
                            ? tokens[tokens.length - 2]
                            : undefined;
                if (token !== undefined) {
                    const parent = caret.source.root.getParent(token);
                    if (parent === undefined) return false;
                    return caret
                        .withEntry(undefined)
                        .withPosition(parent.hasOneLeaf() ? parent : token);
                }
            }
            return false;
        },
    },
    {
        symbol: '⇄',
        description: (l) => l.ui.source.cursor.matchDelimiter,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: false,
        shift: true,
        control: true,
        key: 'Backslash',
        keySymbol: '\\',
        execute: ({ caret }) => {
            if (caret === undefined) return false;
            // Resolve the delimiter token under the caret: either selected as a
            // node, or the token the caret is within.
            const token =
                caret.position instanceof Token
                    ? caret.position
                    : (caret.tokenExcludingSpace ?? undefined);
            if (token === undefined) return false;
            const match = caret.source.getMatchedDelimiter(token);
            if (match === undefined) return false;
            return caret.withPosition(match).withEntry(undefined);
        },
    },
    {
        symbol: SELECTION_SYMBOL,
        description: (l) => l.ui.source.cursor.selectAll,
        visible: Visibility.Visible,
        category: Category.Cursor,
        important: true,
        alt: false,
        shift: false,
        control: true,
        key: 'KeyA',
        keySymbol: 'A',
        execute: ({ editor, caret, blocks }) => {
            if (editor && caret) {
                // If it blocks mode and in side of a block text editable token, select the whole token..
                if (blocks) {
                    const tokenAt = caret.tokenExcludingSpace;
                    const parentAt = tokenAt
                        ? caret.source.getParentNode(tokenAt)
                        : undefined;
                    if (
                        tokenAt &&
                        parentAt &&
                        Caret.isTokenTextBlockEditable(tokenAt, parentAt)
                    )
                        return caret.withPosition(
                            parentAt.hasOneLeaf() ? parentAt : tokenAt,
                        );

                    const tokenAfter = caret.tokenPrior;
                    const parentAfter = tokenAfter
                        ? caret.source.getParentNode(tokenAfter)
                        : undefined;
                    if (
                        tokenAfter &&
                        parentAfter &&
                        Caret.isTokenTextBlockEditable(tokenAfter, parentAfter)
                    )
                        return caret.withPosition(
                            parentAfter.hasOneLeaf() ? parentAfter : tokenAfter,
                        );
                }

                // Select the whole program.
                return caret.withPosition(caret.getProgram());
            }
            return false;
        },
    },
    {
        symbol: TAB_SYMBOL,
        description: (l) => l.ui.source.cursor.insertTab,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: true,
        key: 'Tab',
        keySymbol: TAB_SYMBOL,
        execute: (context) => handleInsert(context, '\t'),
    },
    {
        symbol: TRUE_SYMBOL,
        description: (l) => l.ui.source.cursor.insertTrue,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Digit1',
        keySymbol: '1',
        execute: (context) => handleInsert(context, TRUE_SYMBOL),
    },
    {
        symbol: FALSE_SYMBOL,
        description: (l) => l.ui.source.cursor.insertFalse,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Digit0',
        keySymbol: '0',
        execute: (context) => handleInsert(context, FALSE_SYMBOL),
    },
    {
        symbol: NONE_SYMBOL,
        description: (l) => l.ui.source.cursor.insertNone,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'KeyO',
        keySymbol: 'O',
        execute: (context) => handleInsert(context, NONE_SYMBOL),
    },
    {
        symbol: FUNCTION_SYMBOL,
        description: (l) => l.ui.source.cursor.insertFunction,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        key: 'KeyF',
        keySymbol: 'F',
        shift: false,
        control: false,
        execute: ({ caret, locales }) =>
            caret?.insertNode(
                FunctionDefinition.make(
                    undefined,
                    Names.make([
                        locales.getWithAnnotations((l) => l.term.name),
                    ]),
                    undefined,
                    [],
                    ExpressionPlaceholder.make(),
                ),
                2,
            ) ?? false,
    },
    {
        symbol: TYPE_SYMBOL,
        description: (l) => l.ui.source.cursor.insertType,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Digit8',
        keySymbol: '8',
        execute: (context) => handleInsert(context, TYPE_SYMBOL),
    },
    {
        symbol: DOCS_SYMBOL,
        description: (l) => l.ui.source.cursor.insertDocs,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Digit7',
        keySymbol: '7',
        execute: (context) => handleInsert(context, DOCS_SYMBOL),
    },
    {
        symbol: '≠',
        description: (l) => l.ui.source.cursor.insertNotEqual,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Equal',
        keySymbol: '=',
        execute: (context) => handleInsert(context, '≠'),
    },
    {
        symbol: PRODUCT_SYMBOL,
        description: (l) => l.ui.source.cursor.insertProduct,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'KeyX',
        keySymbol: 'X',
        execute: (context) => handleInsert(context, PRODUCT_SYMBOL),
    },
    {
        symbol: DOT_SYMBOL,
        description: (l) => l.ui.source.cursor.insertDot,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Period',
        keySymbol: '.',
        execute: (context) => handleInsert(context, DOT_SYMBOL),
    },
    {
        symbol: QUOTIENT_SYMBOL,
        description: (l) => l.ui.source.cursor.insertQuotient,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Slash',
        keySymbol: '/',
        execute: (context) => handleInsert(context, QUOTIENT_SYMBOL),
    },
    {
        symbol: DEGREE_SYMBOL,
        description: (l) => l.ui.source.cursor.insertDegree,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: true,
        control: false,
        key: 'Digit8',
        keySymbol: '8',
        execute: (context) => handleInsert(context, DEGREE_SYMBOL),
    },
    {
        symbol: '≤',
        description: (l) => l.ui.source.cursor.insertLessOrEqual,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        control: false,
        alt: true,
        key: 'Comma',
        keySymbol: ',',
        execute: (context) => handleInsert(context, '≤'),
    },
    {
        symbol: '≥',
        keySymbol: '.',
        description: (l) => l.ui.source.cursor.insertGreaterOrEqual,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        control: false,
        alt: true,
        key: 'Period',
        execute: (context) => handleInsert(context, '≥'),
    },
    {
        symbol: STREAM_SYMBOL,
        description: (l) => l.ui.source.cursor.insertStream,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Semicolon',
        keySymbol: ';',
        execute: (context) => handleInsert(context, STREAM_SYMBOL),
    },
    {
        symbol: CHANGE_SYMBOL,
        description: (l) => l.ui.source.cursor.insertChange,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'J',
        keySymbol: 'j',
        execute: (context) => handleInsert(context, CHANGE_SYMBOL),
    },
    {
        symbol: PREVIOUS_SYMBOL,
        description: (l) => l.ui.source.cursor.insertPrevious,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'ArrowLeft',
        keySymbol: '←',
        execute: (context) => handleInsert(context, PREVIOUS_SYMBOL),
    },
    {
        symbol: CONVERT_SYMBOL,
        description: (l) => l.ui.source.cursor.insertConvert,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'ArrowRight',
        keySymbol: CONVERT_SYMBOL,
        execute: (context) => handleInsert(context, CONVERT_SYMBOL),
    },
    {
        // Mirrors the Convert insert shortcut (Alt+→), with Shift for the "bar" arrow ↦.
        symbol: TRANSLATE_SYMBOL,
        description: (l) => l.ui.source.cursor.insertTranslate,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: true,
        control: false,
        key: 'ArrowRight',
        keySymbol: TRANSLATE_SYMBOL,
        execute: (context) => handleInsert(context, TRANSLATE_SYMBOL),
    },
    {
        symbol: THIS_SYMBOL,
        description: (l) => l.ui.source.cursor.insertThis,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Minus',
        keySymbol: '-',
        execute: (context) => handleInsert(context, THIS_SYMBOL),
    },
    {
        symbol: TABLE_OPEN_SYMBOL,
        description: (l) => l.ui.source.cursor.insertTable,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'KeyT',
        keySymbol: 't',
        execute: ({ caret, blocks, project }) => {
            if (caret === undefined) return false;

            // Before inserting (and potentially autocompleting)
            // see if there's an unclosed table open prior to the cursor, and if so, insert a close symbol.
            const tokensPrior = caret?.getTokensPrior();
            if (tokensPrior)
                for (let i = tokensPrior.length - 1; i >= 0; i--) {
                    if (tokensPrior[i].isSymbol(Sym.TableClose)) break;
                    else if (tokensPrior[i].isSymbol(Sym.TableOpen))
                        return (
                            caret.insert(TABLE_CLOSE_SYMBOL, blocks, project) ??
                            true
                        );
                }

            return caret.insert(TABLE_OPEN_SYMBOL, blocks, project) ?? false;
        },
    },
    {
        symbol: TABLE_CLOSE_SYMBOL,
        description: (l) => l.ui.source.cursor.insertTable,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: true,
        control: false,
        key: 'KeyT',
        keySymbol: 't',
        execute: (context) => handleInsert(context, TABLE_CLOSE_SYMBOL),
    },
    // Pattern glyphs (LANGUAGE.md). Palette-only (no shortcut) to avoid key
    // collisions; inserting `⣿` auto-closes to `⣿⣿` via the delimiter machinery.
    {
        symbol: PATTERN_DELIMITER_SYMBOL,
        description: (l) => l.ui.source.cursor.insertPattern,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        alt: false,
        control: false,
        execute: (context) => handleInsert(context, PATTERN_DELIMITER_SYMBOL),
    },
    {
        symbol: MATCH_SEARCH_SYMBOL,
        description: (l) => l.ui.source.cursor.insertSearch,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        alt: false,
        control: false,
        execute: (context) => handleInsert(context, MATCH_SEARCH_SYMBOL),
    },
    {
        symbol: PATTERN_ANY_SYMBOL,
        description: (l) => l.ui.source.cursor.insertPatternAny,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        alt: false,
        control: false,
        execute: (context) => handleInsert(context, PATTERN_ANY_SYMBOL),
    },
    {
        symbol: PATTERN_SPACE_SYMBOL,
        description: (l) => l.ui.source.cursor.insertPatternSpace,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        alt: false,
        control: false,
        execute: (context) => handleInsert(context, PATTERN_SPACE_SYMBOL),
    },
    {
        symbol: PATTERN_START_SYMBOL,
        description: (l) => l.ui.source.cursor.insertPatternStart,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        alt: false,
        control: false,
        execute: (context) => handleInsert(context, PATTERN_START_SYMBOL),
    },
    {
        symbol: PATTERN_END_SYMBOL,
        description: (l) => l.ui.source.cursor.insertPatternEnd,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        alt: false,
        control: false,
        execute: (context) => handleInsert(context, PATTERN_END_SYMBOL),
    },
    {
        symbol: PATTERN_FOLD_SYMBOL,
        description: (l) => l.ui.source.cursor.insertPatternFold,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        alt: false,
        control: false,
        execute: (context) => handleInsert(context, PATTERN_FOLD_SYMBOL),
    },
    {
        symbol: PATTERN_AHEAD_SYMBOL,
        description: (l) => l.ui.source.cursor.insertPatternAhead,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        alt: false,
        control: false,
        execute: (context) => handleInsert(context, PATTERN_AHEAD_SYMBOL),
    },
    {
        symbol: PATTERN_BEHIND_SYMBOL,
        description: (l) => l.ui.source.cursor.insertPatternBehind,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        alt: false,
        control: false,
        execute: (context) => handleInsert(context, PATTERN_BEHIND_SYMBOL),
    },
    {
        symbol: PATTERN_WORD_SYMBOL,
        description: (l) => l.ui.source.cursor.insertPatternWord,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        alt: false,
        control: false,
        execute: (context) => handleInsert(context, PATTERN_WORD_SYMBOL),
    },
    {
        symbol: PATTERN_WORDEDGE_SYMBOL,
        description: (l) => l.ui.source.cursor.insertPatternWordEdge,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        alt: false,
        control: false,
        execute: (context) => handleInsert(context, PATTERN_WORDEDGE_SYMBOL),
    },
    {
        symbol: BORROW_SYMBOL,
        description: (l) => l.ui.source.cursor.insertBorrow,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: true,
        key: 'ArrowDown',
        keySymbol: '↓',
        execute: (context) => handleInsert(context, BORROW_SYMBOL),
    },
    {
        symbol: SHARE_SYMBOL,
        description: (l) => l.ui.source.cursor.insertShare,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: true,
        key: 'ArrowUp',
        keySymbol: '↑',
        execute: (context) => handleInsert(context, SHARE_SYMBOL),
    },
    {
        symbol: ELISION_SYMBOL + ELISION_SYMBOL,
        description: (l) => l.ui.source.cursor.elide,
        visible: Visibility.Visible,
        category: Category.Modify,
        alt: false,
        shift: false,
        control: true,
        key: '8',
        keySymbol: ELISION_SYMBOL,
        execute: ({ caret, blocks }) => {
            if (caret === undefined || blocks) return false;
            else return caret.elide() ?? false;
        },
    },

    // EVALUATE
    StepBackNode,
    StepBack,
    StepBackInput,
    StepForwardNode,
    StepForward,
    StepForwardInput,
    Restart,
    StepToStart,
    StepToPresent,
    StepOut,
    Play,
    Pause,
    EnterFullscreen,
    ExitFullscreen,

    // MODIFY
    ShowMenu,
    Undo,
    Redo,
    ToggleBlocks,
    {
        symbol: '↲',
        description: (l) => l.ui.source.cursor.insertLine,
        visible: Visibility.Visible,
        category: Category.Modify,
        shift: false,
        alt: false,
        control: false,
        key: 'Enter',
        typing: true,
        execute: ({ caret, blocks, project, editor }) =>
            !editor || caret === undefined
                ? false
                : caret.isNode()
                  ? caret.enter(blocks)
                  : caret.insert('\n', blocks, project),
    },
    {
        symbol: '⌫',
        description: (l) => l.ui.source.cursor.backspace,
        visible: Visibility.Touch,
        category: Category.Modify,
        key: 'Backspace',
        keySymbol: '⌫',
        shift: false,
        control: false,
        alt: false,
        typing: true,
        execute: ({ caret, project, editor, blocks }) =>
            editor && caret
                ? (caret.delete(project, false, blocks) ?? false)
                : false,
    },
    {
        symbol: '⌦',
        description: (l) => l.ui.source.cursor.delete,
        visible: Visibility.Touch,
        category: Category.Modify,
        key: 'Delete',
        keySymbol: '⌦',
        shift: false,
        control: false,
        alt: false,
        typing: true,
        execute: ({ caret, project, editor, blocks }) =>
            editor && caret
                ? (caret.delete(project, true, blocks) ?? false)
                : false,
    },
    {
        symbol: CUT_SYMBOL,
        description: (l) => l.ui.source.cursor.cut,
        visible: Visibility.Visible,
        category: Category.Modify,
        important: true,
        control: true,
        shift: false,
        alt: false,
        key: 'KeyX',
        keySymbol: 'X',
        active: ({ caret }) =>
            caret !== undefined &&
            (caret.isNode() || caret.isRange()) &&
            typeof ClipboardItem !== 'undefined',
        execute: ({ caret, project, blocks }) => {
            if (caret === undefined) return false;
            if (caret.isNode()) {
                copyNode(caret.position, getPreferredSpaces(caret.source));
                return caret.delete(project, false, blocks) ?? true;
            } else if (caret.isRange()) {
                return toClipboard(
                    caret.source
                        .getGraphemesBetween(
                            caret.position[0],
                            caret.position[1],
                        )
                        .toString(),
                ).then(() => {
                    return caret.delete(project, false, blocks) ?? true;
                });
            } else return (l) => l.ui.source.cursor.ignored.noSelection;
        },
    },
    {
        symbol: COPY_SYMBOL,
        description: (l) => l.ui.source.cursor.copy,
        visible: Visibility.Visible,
        category: Category.Modify,
        important: true,
        control: true,
        shift: false,
        alt: false,
        key: 'KeyC',
        keySymbol: 'C',
        active: ({ caret }) =>
            caret !== undefined && (caret.isNode() || caret.isRange()),
        execute: ({ caret }) => {
            if (caret === undefined) return false;
            if (caret.isNode())
                return copyNode(
                    caret.position,
                    getPreferredSpaces(caret.source),
                );
            else if (caret.isRange()) {
                return toClipboard(
                    caret.source
                        .getGraphemesBetween(
                            caret.position[0],
                            caret.position[1],
                        )
                        .toString(),
                );
            } else return (l) => l.ui.source.cursor.ignored.noSelection;
        },
    },
    {
        symbol: PASTE_SYMBOL,
        description: (l) => l.ui.source.cursor.paste,
        visible: Visibility.Visible,
        category: Category.Modify,
        important: true,
        control: true,
        shift: false,
        alt: false,
        key: 'KeyV',
        keySymbol: 'V',
        active: ({ editor }) =>
            editor &&
            typeof navigator.clipboard !== 'undefined' &&
            navigator.clipboard.read !== undefined,
        execute: async ({
            editor,
            caret,
            blocks,
            project,
            locales,
            notify,
        }) => {
            if (!editor) return (l) => l.ui.source.cursor.ignored.noEditor;
            // Make sure clipboard is supported.
            if (
                navigator.clipboard === undefined ||
                caret === undefined ||
                navigator.clipboard.read === undefined
            )
                return (l) => l.ui.source.cursor.ignored.noClipboard;

            const items = await navigator.clipboard.read();
            // First, prefer our custom Wordplay format if present: it was copied as Wordplay (possibly
            // from another tab/window/instance), so paste it verbatim without reinterpreting it.
            for (const item of items) {
                if (item.types.includes(WORDPLAY_CLIPBOARD_FORMAT)) {
                    try {
                        const blob = await item.getType(
                            WORDPLAY_CLIPBOARD_FORMAT,
                        );
                        const text = await blob.text();
                        return pasteText(
                            text,
                            caret,
                            project,
                            blocks,
                            locales,
                            notify,
                        );
                    } catch (err) {
                        // Couldn't read the custom format; fall back to text/plain below.
                    }
                }
            }
            for (const item of items) {
                for (const type of item.types) {
                    if (type === 'text/plain') {
                        const blob = await item.getType(type);
                        const text = await blob.text();
                        // If this text was copied from within Wordplay, paste it
                        // verbatim instead of reinterpreting it as foreign data
                        // (e.g. CSV). pasteText handles the blocks-mode conflict feedback.
                        return pasteText(
                            wasCopiedHere(text) ? text : interpret(text),
                            caret,
                            project,
                            blocks,
                            locales,
                            notify,
                        );
                    }
                }
            }
            return (l) => l.ui.source.cursor.ignored.noClipboardItem;
        },
    },
    FoldAll,
    UnfoldAll,
    {
        symbol: '( )',
        description: (l) => l.ui.source.cursor.parenthesize,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: false,
        shift: undefined,
        alt: undefined,
        key: '(',
        active: ({ caret }) => caret?.isNode() ?? false,
        execute: ({ project, caret }) => caret?.wrap(project, '(') ?? false,
    },
    {
        symbol: '[ ]',
        description: (l) => l.ui.source.cursor.enumerate,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: false,
        shift: undefined,
        alt: false,
        key: '[',
        active: ({ caret }) => caret?.isNode() ?? false,
        execute: ({ project, caret }) => caret?.wrap(project, '[') ?? false,
    },
    IncrementLiteral,
    DecrementLiteral,
    ShowKeyboardHelp,
    FocusOutput,
    FocusSource,
    FocusDocs,
    FocusPalette,
    FocusCycle,

    {
        symbol: '🧹',
        description: (l) => l.ui.source.cursor.tidy,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: true,
        shift: false,
        alt: false,
        key: 's',
        important: true,
        execute: ({ caret, editor }) => {
            if (caret && editor) {
                const length = caret.source.code.getLength();
                const position = caret.getTextPosition(true) ?? 0;
                const tidySource = caret.source.withSpaces(
                    getPreferredSpaces(caret.source.root, caret.source.spaces),
                );
                if (tidySource.code.getLength() === length) return false;
                return [
                    tidySource,
                    caret
                        .withSource(tidySource)
                        .withPosition(
                            position + (tidySource.code.getLength() - length),
                        ),
                ];
            } else return false;
        },
    },

    {
        symbol: '+⌕',
        description: (l) => l.ui.source.button.zoomIn,
        visible: Visibility.Visible,
        category: Category.Cursor,
        control: true,
        shift: true,
        alt: true,
        key: 'Equal',
        important: true,
        active: ({ zoom }) => zoom !== undefined && zoom < 16,
        execute: ({ editor, zoom, setZoom }) => {
            if (editor && setZoom && zoom !== undefined) {
                setZoom(zoom + 2);
                return true;
            }
            return false;
        },
    },
    {
        symbol: '–⌕',
        description: (l) => l.ui.source.button.zoomOut,
        visible: Visibility.Visible,
        category: Category.Cursor,
        control: true,
        shift: true,
        alt: true,
        key: 'Minus',
        important: true,
        active: ({ zoom }) => zoom !== undefined && zoom > -4,
        execute: ({ editor, zoom, setZoom }) => {
            if (editor && setZoom && zoom !== undefined) {
                setZoom(zoom - 2);
                return true;
            }
            return false;
        },
    },

    ToggleSearch,
    GoToNextMatch,

    // The catch all
    InsertSymbol,
];

const TouchSupported =
    typeof window !== 'undefined' && 'ontouchstart' in window;

export const VisibleModifyCommands = Commands.filter(
    (c) =>
        c.category === Category.Modify &&
        (c.visible === Visibility.Visible ||
            (TouchSupported && c.visible === Visibility.Touch)),
);

export const VisibleNavigateCommands = Commands.filter(
    (c) =>
        c.category === Category.Cursor &&
        (c.visible === Visibility.Visible ||
            (TouchSupported && c.visible === Visibility.Touch)),
);

export default Commands;
