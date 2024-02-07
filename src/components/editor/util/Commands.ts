import type Caret from '../../../edit/Caret';
import Node from '@nodes/Node';
import {
    CONVERT_SYMBOL,
    FALSE_SYMBOL,
    FUNCTION_SYMBOL,
    STREAM_SYMBOL,
    TRUE_SYMBOL,
    TYPE_SYMBOL,
    PRODUCT_SYMBOL,
    QUOTIENT_SYMBOL,
    NONE_SYMBOL,
    DEGREE_SYMBOL,
    DOCUMENTATION_SYMBOL,
    SOURCE_SYMBOL,
    STAGE_SYMBOL,
    PALETTE_SYMBOL,
    PREVIOUS_SYMBOL,
    TABLE_OPEN_SYMBOL,
    TABLE_CLOSE_SYMBOL,
    EDIT_SYMBOL,
    BORROW_SYMBOL,
    SHARE_SYMBOL,
    CHANGE_SYMBOL,
} from '@parser/Symbols';

import Source from '@nodes/Source';
import { copyNode } from './Clipboard';
import type Evaluator from '@runtime/Evaluator';
import FunctionDefinition from '@nodes/FunctionDefinition';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Names from '@nodes/Names';
import { Settings, type Database } from '@db/Database';
import type Locale from '@locale/Locale';
import Sym from '../../../nodes/Sym';
import type Project from '../../../models/Project';
import interpret from './interpret';
import { TileKind } from '../../project/Tile';
import { TAB_SYMBOL } from '@parser/Spaces';

export type Command = {
    /** The iconographic text symbol to use */
    symbol: string;
    /** Gets the locale string from a locale for use in title and aria-label of UI  */
    description: (locale: Locale) => string;
    /** True if it should be a control in the toolbar */
    visible: Visibility;
    /** The category of command, used to decide where to display controls if visible */
    category: Category;
    /** The key that triggers the command, or if not provided, all keys trigger it */
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
    /** A function that should indicate whether the command is active */
    active?: (context: CommandContext, key: string) => boolean;
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
    | Promise<Edit | ProjectRevision | undefined>
    // Handled, but no side effect
    | true
    // Not handled
    | false;

export type CommandContext = {
    /** The caret for the focused editor */
    caret: Caret | undefined;
    /** Whether an editor is handling this event */
    editor: boolean;
    /** The project we're editing */
    project: Project;
    evaluator: Evaluator;
    database: Database;
    dragging: boolean;
    toggleMenu?: () => void;
    toggleBlocks?: (on: boolean) => void;
    setFullscreen?: (on: boolean) => void;
    focusOrCycleTile?: (content?: TileKind) => void;
    resetInputs?: () => void;
    help?: () => void;
};

export type Edit = Caret | Revision;
export type Revision = [Source, Caret];
export type ProjectRevision = [Project, Caret];

export enum Visibility {
    Visible = 'visible',
    Touch = 'touch',
    Invisible = 'invisible ',
}
export enum Category {
    Cursor = 'cursor',
    Insert = 'insert',
    Modify = 'modify',
    Evaluate = 'evaluate',
    Help = 'help',
}

export function toShortcut(
    command: Command,
    hideControl = false,
    hideShift = false,
    hideAlt = false,
) {
    const mac =
        typeof navigator !== 'undefined' &&
        navigator.userAgent.indexOf('Mac') !== -1;
    return `${command.control && !hideControl ? (mac ? '⌘ ' : 'Ctrl + ') : ''}${
        command.alt && !hideAlt ? (mac ? '⎇ ' : 'Alt + ') : ''
    }${command.shift && !hideShift ? (mac ? '⇧ ' : 'Shift + ') : ''}${
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
            (command.key === undefined ||
                command.key === event.code ||
                command.key === event.key)
        ) {
            // Update matched shortcut to true, since we matched one.
            // The only one that doesn't count is the insert symbol catch all.
            if (command !== InsertSymbol) matchedShortcut = true;

            // Is the command active? If so, execute it.
            if (
                command.active === undefined ||
                command.active(context, event.key)
            ) {
                // If so, execute it.
                const result = command.execute(context, event.key);
                if (result !== false) return [command, result, true];
            }
        }
    }
    // Didn't execute? Return false if we didn't match anything and let the shortcut travel to the browser.
    // If we did match something, return undefined, so we consume the shortcut and don't default to a browser shortcut.
    return [undefined, false, matchedShortcut];
}

export const ShowKeyboardHelp: Command = {
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

export const IncrementLiteral: Command = {
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
    symbol: '←',
    description: (l) => l.ui.timeline.button.backStep,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'ArrowLeft',
    keySymbol: '←',
    active: (context) => !context.evaluator.isAtBeginning(),
    execute: (context) => {
        context.evaluator.stepBackWithinProgram();
        return true;
    },
};

export const StepForward: Command = {
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
        context.evaluator.getStepIndex() < context.evaluator.getStepCount(),
    execute: (context) => context.evaluator.stepWithinProgram(),
};

export const StepBackInput: Command = {
    symbol: '⇠',
    description: (l) => l.ui.timeline.button.backInput,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: true,
    alt: false,
    control: true,
    key: 'ArrowLeft',
    keySymbol: '←',
    active: (context) => !context.evaluator.isAtBeginning(),
    execute: (context) => context.evaluator.stepBackToInput(),
};

export const StepForwardInput: Command = {
    symbol: '⇢',
    description: (l) => l.ui.timeline.button.forwardInput,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: true,
    alt: false,
    control: true,
    key: 'ArrowRight',
    keySymbol: '→',
    active: (context) => context.evaluator.isInPast(),
    execute: (context) => context.evaluator.stepToInput(),
};

export const StepBackNode: Command = {
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
    symbol: '⇤',
    description: (l) => l.ui.timeline.button.start,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'Home',
    active: (context) => !context.evaluator.isAtBeginning(),
    execute: (context) => {
        context.evaluator.stepTo(0);
        return true;
    },
};

export const StepToPresent: Command = {
    symbol: '⇥',
    description: (l) => l.ui.timeline.button.present,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'End',
    active: (context) => context.evaluator.isInPast(),
    execute: (context) => {
        context.evaluator.stepToEnd();
        return true;
    },
};

export const StepOut: Command = {
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
        context.evaluator.getCurrentEvaluation() !== undefined,
    execute: (context) => {
        context.evaluator.stepOut();
        return true;
    },
};

export const Play: Command = {
    symbol: '▶',
    description: (l) => l.ui.timeline.button.play,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'Enter',
    active: (context) => !context.evaluator.isPlaying(),
    execute: (context) => {
        context.evaluator.play();
        return true;
    },
};

export const Pause: Command = {
    symbol: '⏸',
    description: (l) => l.ui.timeline.button.pause,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'Enter',
    active: (context) => context.evaluator.isPlaying(),
    execute: (context) => {
        context.evaluator.pause();
        return true;
    },
};

export const ShowMenu: Command = {
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
    symbol: '▶️',
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
    shift: true,
    alt: true,
    control: true,
    key: 'Enter',
    execute: ({ toggleBlocks }) => {
        if (toggleBlocks) {
            toggleBlocks(!Settings.getBlocks());
            return true;
        }
        return false;
    },
};

/** The command to rule them all... inserts things */
export const InsertSymbol: Command = {
    symbol: 'a',
    description: (l) => l.ui.source.cursor.type,
    visible: Visibility.Invisible,
    category: Category.Modify,
    control: false,
    shift: undefined,
    alt: false,
    typing: true,
    execute: ({ caret, project, editor }, key) => {
        if (editor && caret && key.length === 1)
            return caret.insert(key, project) ?? false;
        else return false;
    },
};

export const Undo: Command = {
    symbol: '⟲',
    description: (l) => l.ui.source.cursor.undo,
    visible: Visibility.Visible,
    category: Category.Modify,
    shift: false,
    control: true,
    alt: false,
    key: 'KeyZ',
    keySymbol: 'Z',
    active: ({ database, evaluator }) =>
        database.Projects.getHistory(
            evaluator.project.getID(),
        )?.isUndoable() === true,
    execute: ({ database, evaluator }) =>
        database.Projects.undoRedo(evaluator.project.getID(), -1) !== undefined,
};

const Commands: Command[] = [
    {
        symbol: '↑',
        description: (l) => l.ui.source.cursor.priorLine,
        visible: Visibility.Touch,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'ArrowUp',
        keySymbol: '↑',
        execute: ({ caret }) => caret?.moveVertical(-1) ?? false,
    },
    {
        symbol: '↓',
        description: (l) => l.ui.source.cursor.nextLine,
        visible: Visibility.Touch,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'ArrowDown',
        keySymbol: '↓',
        execute: ({ caret }) => caret?.moveVertical(1) ?? false,
    },
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
        execute: ({ caret, database }) =>
            caret?.moveInline(
                false,
                database.Locales.getWritingDirection() === 'ltr' ? -1 : 1,
            ) ?? false,
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
        execute: ({ caret, database }) =>
            caret?.moveInline(
                false,
                database.Locales.getWritingDirection() === 'ltr' ? 1 : -1,
            ) ?? false,
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
        visible: Visibility.Visible,
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
        visible: Visibility.Visible,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: true,
        keySymbol: '→',
        key: 'ArrowRight',
        execute: ({ caret }) => caret?.right(true) ?? false,
    },
    {
        symbol: '▣',
        description: (l) => l.ui.source.cursor.parent,
        visible: Visibility.Visible,
        category: Category.Cursor,
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
                    return caret.withPosition(parent);
            }
            // Find the node corresponding to the position.
            // And if it's parent only has the one child, select it.
            else {
                const token =
                    caret.atTokenEnd() && caret.hasSpaceAfter()
                        ? caret.tokenPrior
                        : caret.getToken();
                if (token !== undefined) {
                    const parent = caret.source.root.getParent(token);
                    return caret.withPosition(
                        parent?.getChildren()[0] === token ? parent : token,
                    );
                }
            }
            return false;
        },
    },
    {
        symbol: '📄',
        description: (l) => l.ui.source.cursor.selectAll,
        visible: Visibility.Visible,
        category: Category.Cursor,
        alt: false,
        shift: false,
        control: true,
        key: 'KeyA',
        keySymbol: 'A',
        execute: ({ editor, caret }) =>
            editor && caret ? caret.withPosition(caret.getProgram()) : false,
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
        execute: ({ caret }) => caret?.insert('\t') ?? false,
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
        execute: ({ caret }) => caret?.insert(TRUE_SYMBOL) ?? false,
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
        execute: ({ caret }) => caret?.insert(FALSE_SYMBOL) ?? false,
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
        execute: ({ caret }) => caret?.insert(NONE_SYMBOL) ?? false,
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
        execute: ({ caret }) =>
            caret?.insertNode(
                FunctionDefinition.make(
                    undefined,
                    Names.make([]),
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
        execute: ({ caret }) => caret?.insert(TYPE_SYMBOL) ?? false,
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
        execute: ({ caret }) => caret?.insert('≠') ?? false,
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
        execute: ({ caret }) => caret?.insert(PRODUCT_SYMBOL) ?? false,
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
        execute: ({ caret }) => caret?.insert(QUOTIENT_SYMBOL) ?? false,
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
        execute: ({ caret }) => caret?.insert(DEGREE_SYMBOL) ?? false,
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
        execute: ({ caret }) => caret?.insert('≤') ?? false,
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
        execute: ({ caret }) => caret?.insert('≥') ?? false,
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
        execute: ({ caret }) => caret?.insert(STREAM_SYMBOL) ?? false,
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
        keySymbol: '∆',
        execute: ({ caret }) => caret?.insert(CHANGE_SYMBOL) ?? false,
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
        execute: ({ caret }) => caret?.insert(PREVIOUS_SYMBOL) ?? false,
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
        execute: ({ caret }) => caret?.insert(CONVERT_SYMBOL) ?? false,
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
        execute: ({ caret }) => {
            if (caret === undefined) return false;

            // Before inserting (and potentially autocompleting)
            // see if there's an unclosed table open prior to the cursor, and if so, insert a close symbol.
            const tokensPrior = caret?.getTokensPrior();
            if (tokensPrior)
                for (let i = tokensPrior.length - 1; i >= 0; i--) {
                    if (tokensPrior[i].isSymbol(Sym.TableClose)) break;
                    else if (tokensPrior[i].isSymbol(Sym.TableOpen))
                        return caret.insert(TABLE_CLOSE_SYMBOL) ?? true;
                }

            return caret.insert(TABLE_OPEN_SYMBOL) ?? false;
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
        execute: ({ caret }) => {
            if (caret === undefined) return false;
            return caret.insert(TABLE_CLOSE_SYMBOL) ?? false;
        },
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
        execute: ({ caret }) => {
            if (caret === undefined) return false;
            return caret.insert(BORROW_SYMBOL) ?? false;
        },
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
        execute: ({ caret }) => {
            if (caret === undefined) return false;
            return caret.insert(SHARE_SYMBOL) ?? false;
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
    {
        symbol: '⟳',
        description: (l) => l.ui.source.cursor.redo,
        visible: Visibility.Visible,
        category: Category.Modify,
        shift: true,
        control: true,
        alt: false,
        key: 'KeyZ',
        keySymbol: 'Z',
        active: ({ evaluator, database }) =>
            database.Projects.getHistory(
                evaluator.project.getID(),
            )?.isRedoable() === true,
        execute: ({ database, evaluator }) =>
            database.Projects.undoRedo(evaluator.project.getID(), 1) !==
            undefined,
    },
    ToggleBlocks,
    {
        symbol: '↲',
        description: (l) => l.ui.source.cursor.insertLine,
        visible: Visibility.Touch,
        category: Category.Modify,
        shift: false,
        alt: false,
        control: false,
        key: 'Enter',
        typing: true,
        execute: ({ caret }) =>
            caret === undefined
                ? false
                : caret.isNode()
                  ? caret.enter()
                  : caret.insert('\n') ?? true,
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
        execute: ({ caret, project, editor }) =>
            editor && caret ? caret.delete(project, false) ?? true : false,
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
        execute: ({ caret, project, editor }) =>
            editor && caret ? caret.delete(project, true) ?? true : false,
    },
    {
        symbol: '✄',
        description: (l) => l.ui.source.cursor.cut,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: true,
        shift: false,
        alt: false,
        key: 'KeyX',
        keySymbol: 'X',
        active: () => typeof ClipboardItem !== 'undefined',
        execute: (context) => {
            if (!(context.caret?.position instanceof Node)) return false;
            copyNode(
                context.caret.position,
                context.caret.source.spaces.withPreferredSpace(
                    context.caret.source,
                ),
            );
            return context.caret.delete(context.project, false) ?? true;
        },
    },
    {
        symbol: '📚',
        description: (l) => l.ui.source.cursor.copy,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: true,
        shift: false,
        alt: false,
        key: 'KeyC',
        keySymbol: 'C',
        execute: (context) => {
            if (!(context.caret?.position instanceof Node)) return false;
            return (
                copyNode(
                    context.caret.position,
                    context.caret.source.spaces.withPreferredSpace(
                        context.caret.source,
                    ),
                ) ?? false
            );
        },
    },
    {
        symbol: '📋',
        description: (l) => l.ui.source.cursor.paste,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: true,
        shift: false,
        alt: false,
        key: 'KeyV',
        keySymbol: 'V',
        active: () =>
            typeof navigator.clipboard !== 'undefined' &&
            navigator.clipboard.read !== undefined,
        execute: async ({ caret }) => {
            // Make sure clipboard is supported.
            if (
                navigator.clipboard === undefined ||
                caret === undefined ||
                navigator.clipboard.read === undefined
            )
                return undefined;

            const items = await navigator.clipboard.read();
            for (const item of items) {
                for (const type of item.types) {
                    if (type === 'text/plain') {
                        const blob = await item.getType(type);
                        const text = await blob.text();
                        return caret.insert(interpret(text));
                    }
                }
            }
            return undefined;
        },
    },
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
        execute: ({ caret }) => caret?.wrap('(') ?? false,
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
        execute: ({ caret }) => caret?.wrap('[') ?? false,
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
        execute: ({ caret }) => {
            if (caret) {
                const length = caret.source.code.getLength();
                const position = caret.getTextPosition(true) ?? 0;
                const tidySource = caret.source.withPreferredSpace();
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

    // The catch all
    InsertSymbol,
];

const TouchSupported =
    typeof window !== 'undefined' && 'ontouchstart' in window;

export const VisibleModifyCommands = Commands.filter(
    (c) =>
        (c.category === Category.Cursor || c.category === Category.Modify) &&
        (c.visible === Visibility.Visible ||
            (TouchSupported && c.visible === Visibility.Touch)),
);

export default Commands;
