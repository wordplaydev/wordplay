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
} from '@parser/Symbols';

import type Source from '@nodes/Source';
import { toClipboard } from './Clipboard';
import type Evaluator from '@runtime/Evaluator';
import FunctionDefinition from '@nodes/FunctionDefinition';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Names from '@nodes/Names';
import type { Creator } from '@db/Creator';
import type Locale from '@locale/Locale';
import Program from '@nodes/Program';
import { Content } from '../../project/Tile';

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
    active?: (context: CommandContext, key: string) => boolean;
    /** Generates an edit or other editor command */
    execute: (
        context: CommandContext,
        key: string
    ) => // Process this edit
    | Edit
        // Wait and process this edit
        | Promise<Edit | undefined>
        // Handled
        | boolean
        // Not handled
        | undefined
        | void;
};

export type CommandContext = {
    caret: Caret | undefined;
    evaluator: Evaluator;
    creator: Creator;
    toggleMenu?: () => void;
    fullscreen?: (on: boolean) => void;
    focusOrCycleTile?: (content?: Content) => void;
    help?: () => void;
};

export type Edit = Caret | Revision;
export type Revision = [Source, Caret];
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

export function toShortcut(command: Command) {
    const mac =
        typeof navigator !== 'undefined' &&
        navigator.userAgent.indexOf('Mac') !== -1;
    return `${command.control ? (mac ? '⌘ ' : 'Ctrl + ') : ''}${
        command.alt ? (mac ? '⎇ ' : 'Alt + ') : ''
    }${command.shift ? (mac ? '⇧ ' : 'Shift + ') : ''}${
        command.keySymbol ?? command.key ?? '-'
    }`;
}

export function handleKeyCommand(
    event: KeyboardEvent,
    context: CommandContext
) {
    // Map meta key to control on Mac OS/iOS.
    const control = event.metaKey || event.ctrlKey;

    // Loop through the commands and see if there's a match to this event.
    for (const command of Commands) {
        // Does this command match the event?
        if (
            (command.active === undefined ||
                command.active(context, event.key)) &&
            (command.control === undefined || command.control === control) &&
            (command.shift === undefined || command.shift === event.shiftKey) &&
            (command.alt === undefined || command.alt === event.altKey) &&
            (command.key === undefined ||
                command.key === event.code ||
                command.key === event.key)
        ) {
            // If so, execute it.
            const result = command.execute(context, event.key);
            if (result !== false) return result;
        }
    }
    return false;
}

export const ShowKeyboardHelp: Command = {
    symbol: '⌨️',
    description: (l) => l.ui.description.help,
    visible: Visibility.Invisible,
    category: Category.Help,
    shift: false,
    alt: false,
    control: true,
    key: 'Slash',
    keySymbol: '?',
    execute: (context) => (context.help ? context.help() : false),
};

export const IncrementLiteral: Command = {
    symbol: '+',
    description: (l) => l.ui.description.incrementLiteral,
    visible: Visibility.Touch,
    category: Category.Modify,
    control: false,
    alt: true,
    shift: false,
    key: 'ArrowUp',
    keySymbol: '↑',
    active: ({ caret }) => caret?.getAdjustableLiteral() !== undefined ?? false,
    execute: ({ caret }) => caret?.adjustLiteral(undefined, 1) ?? false,
};

export const DecrementLiteral: Command = {
    symbol: '−',
    description: (l) => l.ui.description.decrementLiteral,
    visible: Visibility.Touch,
    category: Category.Modify,
    shift: false,
    control: false,
    alt: true,
    key: 'ArrowDown',
    keySymbol: '↓',
    active: ({ caret }) => caret?.getAdjustableLiteral() !== undefined ?? false,
    execute: ({ caret }) => caret?.adjustLiteral(undefined, -1) ?? false,
};

export const StepBack: Command = {
    symbol: '←',
    description: (l) => l.ui.description.backStep,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'ArrowLeft',
    keySymbol: '←',
    active: (context) => !context.evaluator.isAtBeginning(),
    execute: (context) => context.evaluator.stepBackWithinProgram(),
};

export const StepForward: Command = {
    symbol: '→',
    description: (l) => l.ui.description.forwardStep,
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
    description: (l) => l.ui.description.backInput,
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
    description: (l) => l.ui.description.forwardInput,
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
    symbol: '⏴',
    description: (l) => l.ui.description.backNode,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'ArrowLeft',
    keySymbol: '←',
    active: ({ caret }) => caret?.isNode() ?? false,
    execute: (context) =>
        context.caret?.position instanceof Node
            ? context.evaluator.stepBackToNode(context.caret.position)
            : undefined,
};

export const StepForwardNode: Command = {
    symbol: '⏵',
    description: (l) => l.ui.description.forwardNode,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    key: 'ArrowRight',
    keySymbol: '→',
    shift: false,
    alt: false,
    control: true,
    active: (context) => context.caret?.isNode() ?? false,
    execute: (context) =>
        context.caret?.position instanceof Node
            ? context.evaluator.stepToNode(context.caret.position)
            : undefined,
};

export const Restart: Command = {
    symbol: '↻',
    description: (l) => l.ui.description.reset,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    key: 'Enter',
    shift: true,
    alt: false,
    control: true,
    execute: (context) =>
        context.creator.reviseProject(
            context.evaluator.project,
            context.evaluator.project.clone()
        ),
};

export const StepToStart: Command = {
    symbol: '⇤',
    description: (l) => l.ui.description.start,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: true,
    alt: true,
    control: true,
    key: 'ArrowLeft',
    keySymbol: '←',
    active: (context) => !context.evaluator.isAtBeginning(),
    execute: (context) => context.evaluator.stepTo(0),
};

export const StepToPresent: Command = {
    symbol: '⇥',
    description: (l) => l.ui.description.forwardInput,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: true,
    alt: true,
    control: true,
    key: 'ArrowRight',
    keySymbol: '⇢',
    active: (context) => context.evaluator.isInPast(),
    execute: (context) => context.evaluator.stepToEnd(),
};

export const StepOut: Command = {
    symbol: '↑',
    description: (l) => l.ui.description.out,
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
    execute: (context) => context.evaluator.stepOut(),
};

export const Play: Command = {
    symbol: '▶️',
    description: (l) => l.ui.description.play,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'Enter',
    active: (context) => !context.evaluator.isPlaying(),
    execute: (context) => context.evaluator.play(),
};

export const Pause: Command = {
    symbol: '⏸',
    description: (l) => l.ui.description.pause,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'Enter',
    active: (context) => context.evaluator.isPlaying(),
    execute: (context) => context.evaluator.pause(),
};

export const ShowMenu: Command = {
    symbol: '▾',
    description: (l) => l.ui.description.menu,
    visible: Visibility.Visible,
    category: Category.Modify,
    shift: false,
    alt: false,
    control: true,
    key: 'ArrowDown',
    keySymbol: '↓',
    execute: (context) =>
        context.toggleMenu ? context.toggleMenu() : undefined,
};

export const EnterFullscreen: Command = {
    symbol: '▶️',
    description: (l) => l.ui.description.fullscreen,
    visible: Visibility.Invisible,
    category: Category.Evaluate,
    shift: false,
    alt: true,
    control: true,
    key: 'Enter',
    execute: (context) =>
        context.fullscreen ? context.fullscreen(true) : false,
};

export const ExitFullscreen: Command = {
    symbol: '✎',
    description: (l) => l.ui.description.fullscreen,
    visible: Visibility.Invisible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: false,
    key: 'Escape',
    execute: (context) =>
        context.fullscreen ? context.fullscreen(false) : false,
};

export const FocusOutput: Command = {
    symbol: STAGE_SYMBOL,
    description: (l) => l.ui.description.focusOutput,
    visible: Visibility.Invisible,
    category: Category.Cursor,
    shift: false,
    alt: true,
    control: true,
    key: 'Digit1',
    execute: (context) =>
        context.focusOrCycleTile
            ? context.focusOrCycleTile(Content.Output)
            : false,
};

export const FocusSource: Command = {
    symbol: SOURCE_SYMBOL,
    description: (l) => l.ui.description.focusSource,
    visible: Visibility.Invisible,
    category: Category.Cursor,
    shift: false,
    alt: true,
    control: true,
    key: 'Digit2',
    execute: (context) =>
        context.focusOrCycleTile
            ? context.focusOrCycleTile(Content.Source)
            : false,
};

export const FocusDocs: Command = {
    symbol: DOCUMENTATION_SYMBOL,
    description: (l) => l.ui.description.focusDocs,
    visible: Visibility.Invisible,
    category: Category.Cursor,
    shift: false,
    alt: true,
    control: true,
    key: 'Digit3',
    execute: (context) =>
        context.focusOrCycleTile
            ? context.focusOrCycleTile(Content.Documentation)
            : false,
};

export const FocusPalette: Command = {
    symbol: PALETTE_SYMBOL,
    description: (l) => l.ui.description.focusPalette,
    visible: Visibility.Invisible,
    category: Category.Cursor,
    shift: false,
    alt: true,
    control: true,
    key: 'Digit4',
    execute: (context) =>
        context.focusOrCycleTile
            ? context.focusOrCycleTile(Content.Palette)
            : false,
};

export const FocusCycle: Command = {
    symbol: '💬',
    description: (l) => l.ui.description.focusCycle,
    visible: Visibility.Invisible,
    category: Category.Cursor,
    shift: false,
    alt: true,
    control: true,
    key: 'Digit0',
    execute: (context) =>
        context.focusOrCycleTile ? context.focusOrCycleTile() : false,
};

const Commands: Command[] = [
    {
        symbol: '↑',
        description: (l) => l.ui.description.cursorLineBefore,
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
        description: (l) => l.ui.description.cursorLineAfter,
        visible: Visibility.Touch,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'ArrowDown',
        keySymbol: '↓',
        execute: ({ caret }) => caret?.moveVertical(1),
    },
    {
        symbol: '←',
        description: (l) => l.ui.description.cursorInlineBefore,
        visible: Visibility.Touch,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'ArrowLeft',
        keySymbol: '←',
        execute: ({ caret, creator }) =>
            caret?.moveInline(
                false,
                creator.getWritingDirection() === 'ltr' ? -1 : 1
            ) ?? false,
    },
    {
        symbol: '→',
        description: (l) => l.ui.description.cursorInlineAfter,
        visible: Visibility.Touch,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'ArrowRight',
        keySymbol: '→',
        execute: ({ caret, creator }) =>
            caret?.moveInline(
                false,
                creator.getWritingDirection() === 'ltr' ? 1 : -1
            ) ?? false,
    },
    {
        symbol: '⬉',
        description: (l) => l.ui.description.cursorNeighborBefore,
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
        description: (l) => l.ui.description.cursorNeighborAfter,
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
        description: (l) => l.ui.description.cursorContainer,
        visible: Visibility.Visible,
        category: Category.Cursor,
        key: 'Escape',
        keySymbol: '␛',
        alt: undefined,
        control: false,
        shift: undefined,
        execute: ({ caret }) => {
            if (caret === undefined) return false;
            const position = caret.position;
            if (position instanceof Node) {
                // Don't select program's parent.
                if (position instanceof Program) return undefined;
                let parent = caret.source.root.getParent(position);
                if (parent) return caret.withPosition(parent);
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
                        parent?.getChildren()[0] === token ? parent : token
                    );
                }
            }
            return false;
        },
    },
    {
        symbol: '📄',
        description: (l) => l.ui.description.selectAll,
        visible: Visibility.Visible,
        category: Category.Cursor,
        alt: false,
        shift: false,
        control: true,
        key: 'KeyA',
        keySymbol: 'A',
        execute: ({ caret }) =>
            caret?.withPosition(caret.getProgram()) ?? false,
    },
    {
        symbol: TRUE_SYMBOL,
        description: (l) => l.ui.description.insertTrueSymbol,
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
        description: (l) => l.ui.description.insertFalseSymbol,
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
        description: (l) => l.ui.description.insertNoneSymbol,
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
        description: (l) => l.ui.description.insertFunctionSymbol,
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
                    ExpressionPlaceholder.make()
                ),
                2
            ) ?? false,
    },
    {
        symbol: TYPE_SYMBOL,
        description: (l) => l.ui.description.insertFalseSymbol,
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
        description: (l) => l.ui.description.insertNotEqualSymbol,
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
        description: (l) => l.ui.description.insertProductSymbol,
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
        description: (l) => l.ui.description.insertQuotientSymbol,
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
        description: (l) => l.ui.description.insertDegreeSymbol,
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
        description: (l) => l.ui.description.insertLessThanOrEqualSymbol,
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
        description: (l) => l.ui.description.insertGreaterThanOrEqualSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        control: false,
        alt: true,
        key: 'Period',
        execute: ({ caret }) => caret?.insert('≥') ?? false,
    },
    {
        symbol: CONVERT_SYMBOL,
        description: (l) => l.ui.description.insertConvertSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'ArrowRight',
        keySymbol: '→',
        execute: ({ caret }) => caret?.insert(CONVERT_SYMBOL) ?? false,
    },
    {
        symbol: STREAM_SYMBOL,
        description: (l) => l.ui.description.insertStreamSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Semicolon',
        keySymbol: ';',
        execute: ({ caret }) => caret?.insert(STREAM_SYMBOL) ?? false,
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
    {
        symbol: '⟲',
        description: (l) => l.ui.description.undo,
        visible: Visibility.Visible,
        category: Category.Modify,
        shift: false,
        control: true,
        alt: false,
        key: 'KeyZ',
        keySymbol: 'Z',
        active: (context) =>
            context.creator.projectIsUndoable(context.evaluator.project.id),
        execute: (context) =>
            context.creator.undoProject(context.evaluator.project.id) === true,
    },
    {
        symbol: '⟳',
        description: (l) => l.ui.description.redo,
        visible: Visibility.Visible,
        category: Category.Modify,
        shift: true,
        control: true,
        alt: false,
        key: 'KeyZ',
        keySymbol: 'Z',
        active: (context) =>
            context.creator.projectIsRedoable(context.evaluator.project.id),
        execute: (context) =>
            context.creator.redoProject(context.evaluator.project.id) === true,
    },
    {
        symbol: '↲',
        description: (l) => l.ui.description.insertLineBreak,
        visible: Visibility.Touch,
        category: Category.Modify,
        shift: false,
        alt: false,
        control: false,
        key: 'Enter',
        execute: ({ caret }) =>
            caret === undefined
                ? false
                : caret.isNode()
                ? caret.enter()
                : caret.insert('\n'),
    },
    {
        symbol: '⌫',
        description: (l) => l.ui.description.backspace,
        visible: Visibility.Touch,
        category: Category.Modify,
        key: 'Backspace',
        keySymbol: '⌫',
        shift: false,
        control: false,
        alt: false,
        execute: ({ caret }) => caret?.backspace() ?? false,
    },
    {
        symbol: '✂️',
        description: (l) => l.ui.description.cut,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: true,
        shift: false,
        alt: false,
        key: 'KeyX',
        keySymbol: 'X',
        execute: (context) => {
            if (!(context.caret?.position instanceof Node)) return false;
            toClipboard(context.caret.position, context.caret.source.spaces);
            return context.caret.backspace();
        },
    },
    {
        symbol: '📚',
        description: (l) => l.ui.description.copy,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: true,
        shift: false,
        alt: false,
        key: 'KeyC',
        keySymbol: 'C',
        execute: (context) => {
            if (!(context.caret?.position instanceof Node)) return false;
            return toClipboard(
                context.caret.position,
                context.caret.source.spaces
            );
        },
    },
    {
        symbol: '📋',
        description: (l) => l.ui.description.paste,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: true,
        shift: false,
        alt: false,
        key: 'KeyV',
        keySymbol: 'V',
        execute: async ({ caret }) => {
            // See if there's something on the clipboard.
            if (navigator.clipboard === undefined || caret === undefined)
                return undefined;

            const items = await navigator.clipboard.read();
            for (const item of items) {
                for (const type of item.types) {
                    if (type === 'text/plain') {
                        const blob = await item.getType(type);
                        const text = await blob.text();
                        return caret.insert(text);
                    }
                }
            }
            return undefined;
        },
    },
    {
        symbol: '( _ )',
        description: (l) => l.ui.description.parenthesize,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: false,
        shift: undefined,
        alt: undefined,
        key: '(',
        active: ({ caret }) => caret?.isNode() ?? false,
        execute: ({ caret }) => caret?.wrap('('),
    },
    {
        symbol: '[ _ ]',
        description: (l) => l.ui.description.enumerate,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: undefined,
        shift: undefined,
        alt: undefined,
        key: '[',
        active: ({ caret }) => caret?.isNode() ?? false,
        execute: ({ caret }) => caret?.wrap('['),
    },
    IncrementLiteral,
    DecrementLiteral,
    /** The command to rule them all... inserts things */
    {
        symbol: 'a',
        description: (l) => l.ui.description.type,
        visible: Visibility.Invisible,
        category: Category.Modify,
        control: false,
        shift: undefined,
        alt: false,
        execute: ({ caret }, key) =>
            caret && key.length === 1 ? caret.insert(key) : false,
    },
    ShowKeyboardHelp,
    FocusOutput,
    FocusSource,
    FocusDocs,
    FocusPalette,
    FocusCycle,
];

export const VisibleModifyCommands = Commands.filter(
    (c) =>
        (c.category === Category.Cursor || c.category === Category.Modify) &&
        (c.visible === Visibility.Visible || c.visible === Visibility.Touch)
);

export default Commands;
