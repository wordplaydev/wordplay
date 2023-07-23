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
} from '@parser/Symbols';

import type Source from '@nodes/Source';
import { toClipboard } from './Clipboard';
import type Evaluator from '@runtime/Evaluator';
import FunctionDefinition from '@nodes/FunctionDefinition';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Names from '@nodes/Names';
import type { Creator } from '../../../db/Creator';
import type { Locale } from '../../../locale/Locale';

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
}

export function toShortcut(command: Command) {
    const mac =
        typeof navigator !== 'undefined' &&
        navigator.userAgent.indexOf('Mac') !== -1;
    return `${command.control ? (mac ? '⌘ ' : 'Ctrl + ') : ''}${
        command.alt ? (mac ? '⎇ ' : 'Alt + ') : ''
    }${command.shift ? (mac ? '⇧' : 'Shift + ') : ''}${
        command.keySymbol ?? command.key ?? '-'
    }`;
}

export type CommandContext = {
    caret: Caret;
    evaluator: Evaluator;
    creator: Creator;
};

export function handleKeyCommand(
    event: KeyboardEvent,
    context: CommandContext
) {
    // Map meta key to control on Mac OS/iOS.
    const control = event.metaKey || event.ctrlKey;

    // Loop through the commands and see if there's a match to this event.
    for (const command of commands) {
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
            return command.execute(context, event.key);
        }
    }
    return false;
}

export const IncrementLiteral: Command = {
    symbol: '+',
    description: (l) => l.ui.tooltip.incrementLiteral,
    visible: Visibility.Touch,
    category: Category.Modify,
    control: false,
    alt: true,
    shift: false,
    key: 'ArrowUp',
    keySymbol: '↑',
    execute: (context) => context.caret.adjustLiteral(undefined, 1),
};

export const DecrementLiteral: Command = {
    symbol: '–',
    description: (l) => l.ui.tooltip.decrementLiteral,
    visible: Visibility.Touch,
    category: Category.Modify,
    shift: false,
    control: false,
    alt: true,
    key: 'ArrowDown',
    keySymbol: '↓',
    execute: (context) => context.caret.adjustLiteral(undefined, -1),
};

export const StepBack: Command = {
    symbol: '←',
    description: (l) => l.ui.tooltip.backStep,
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
    description: (l) => l.ui.tooltip.forwardStep,
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
    description: (l) => l.ui.tooltip.backInput,
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
    description: (l) => l.ui.tooltip.forwardInput,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: true,
    alt: false,
    control: true,
    key: 'ArrowRight',
    keySymbol: '⇢',
    active: (context) => context.evaluator.isInPast(),
    execute: (context) => context.evaluator.stepToInput(),
};

export const StepBackNode: Command = {
    symbol: '⏴',
    description: (l) => l.ui.tooltip.backNode,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'ArrowLeft',
    keySymbol: '←',
    active: (context) => context.caret.isNode(),
    execute: (context) =>
        context.caret.position instanceof Node
            ? context.evaluator.stepBackToNode(context.caret.position)
            : undefined,
};

export const StepForwardNode: Command = {
    symbol: '⏵',
    description: (l) => l.ui.tooltip.forwardNode,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    key: 'ArrowRight',
    keySymbol: '→',
    shift: false,
    alt: false,
    control: true,
    active: (context) => context.caret.isNode(),
    execute: (context) =>
        context.caret.position instanceof Node
            ? context.evaluator.stepToNode(context.caret.position)
            : undefined,
};

export const Restart: Command = {
    symbol: '↻',
    description: (l) => l.ui.tooltip.reset,
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
    description: (l) => l.ui.tooltip.start,
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
    description: (l) => l.ui.tooltip.forwardInput,
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
    description: (l) => l.ui.tooltip.out,
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
    description: (l) => l.ui.tooltip.play,
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
    symbol: '⏸️',
    description: (l) => l.ui.tooltip.pause,
    visible: Visibility.Visible,
    category: Category.Evaluate,
    shift: false,
    alt: false,
    control: true,
    key: 'Enter',
    active: (context) => context.evaluator.isPlaying(),
    execute: (context) => context.evaluator.pause(),
};

const commands: Command[] = [
    {
        symbol: '↑',
        description: (l) => l.ui.tooltip.cursorLineBefore,
        visible: Visibility.Touch,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'ArrowUp',
        keySymbol: '↑',
        execute: (context) => context.caret.moveVertical(-1),
    },
    {
        symbol: '↓',
        description: (l) => l.ui.tooltip.cursorLineAfter,
        visible: Visibility.Touch,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'ArrowDown',
        keySymbol: '↓',
        execute: (context) => context.caret.moveVertical(1),
    },
    {
        symbol: '←',
        description: (l) => l.ui.tooltip.cursorInlineBefore,
        visible: Visibility.Touch,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'ArrowLeft',
        keySymbol: '←',
        execute: (context) =>
            context.caret.moveInline(
                false,
                context.creator.getWritingDirection() === 'ltr' ? -1 : 1
            ),
    },
    {
        symbol: '→',
        description: (l) => l.ui.tooltip.cursorInlineAfter,
        visible: Visibility.Touch,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'ArrowRight',
        keySymbol: '→',
        execute: (context) =>
            context.caret.moveInline(
                false,
                context.creator.getWritingDirection() === 'ltr' ? 1 : -1
            ),
    },
    {
        symbol: '↖',
        description: (l) => l.ui.tooltip.cursorNeighborBefore,
        visible: Visibility.Visible,
        category: Category.Cursor,
        alt: false,
        shift: true,
        control: false,
        key: 'ArrowLeft',
        keySymbol: '←',
        execute: (context) => context.caret.left(true),
    },
    {
        symbol: '↗',
        description: (l) => l.ui.tooltip.cursorNeighborAfter,
        visible: Visibility.Visible,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: true,
        keySymbol: '→',
        key: 'ArrowRight',
        execute: (context) => context.caret.right(true),
    },
    {
        symbol: '▣',
        description: (l) => l.ui.tooltip.cursorContainer,
        visible: Visibility.Visible,
        category: Category.Cursor,
        key: 'Escape',
        keySymbol: '␛',
        alt: undefined,
        control: false,
        shift: undefined,
        execute: (context) => {
            const caret = context.caret;
            const position = caret.position;
            if (position instanceof Node) {
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
        },
    },
    {
        symbol: '▮',
        description: (l) => l.ui.tooltip.selectAll,
        visible: Visibility.Visible,
        category: Category.Cursor,
        alt: false,
        shift: false,
        control: true,
        key: 'KeyA',
        keySymbol: 'a',
        execute: (context) =>
            context.caret.withPosition(context.caret.getProgram()),
    },
    IncrementLiteral,
    DecrementLiteral,
    {
        symbol: TRUE_SYMBOL,
        description: (l) => l.ui.tooltip.insertTrueSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Digit1',
        keySymbol: '1',
        execute: (context) => context.caret.insert(TRUE_SYMBOL),
    },
    {
        symbol: FALSE_SYMBOL,
        description: (l) => l.ui.tooltip.insertFalseSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Digit0',
        keySymbol: '0',
        execute: (context) => context.caret.insert(FALSE_SYMBOL),
    },
    {
        symbol: NONE_SYMBOL,
        description: (l) => l.ui.tooltip.insertNoneSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'KeyO',
        keySymbol: 'o',
        execute: (context) => context.caret.insert(NONE_SYMBOL),
    },
    {
        symbol: FUNCTION_SYMBOL,
        description: (l) => l.ui.tooltip.insertFunctionSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        key: 'KeyF',
        keySymbol: 'f',
        shift: false,
        control: false,
        execute: (context) =>
            context.caret.insertNode(
                FunctionDefinition.make(
                    undefined,
                    Names.make([]),
                    undefined,
                    [],
                    ExpressionPlaceholder.make()
                ),
                2
            ),
    },
    {
        symbol: TYPE_SYMBOL,
        description: (l) => l.ui.tooltip.insertFalseSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Digit8',
        keySymbol: '8',
        execute: (context) => context.caret.insert(TYPE_SYMBOL),
    },
    {
        symbol: '≠',
        description: (l) => l.ui.tooltip.insertNotEqualSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Equal',
        keySymbol: '=',
        execute: (context) => context.caret.insert('≠'),
    },
    {
        symbol: PRODUCT_SYMBOL,
        description: (l) => l.ui.tooltip.insertProductSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'KeyX',
        keySymbol: 'x',
        execute: (context) => context.caret.insert(PRODUCT_SYMBOL),
    },
    {
        symbol: QUOTIENT_SYMBOL,
        description: (l) => l.ui.tooltip.insertQuotientSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Slash',
        keySymbol: '/',
        execute: (context) => context.caret.insert(QUOTIENT_SYMBOL),
    },
    {
        symbol: DEGREE_SYMBOL,
        description: (l) => l.ui.tooltip.insertDegreeSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: true,
        control: false,
        key: 'Digit8',
        keySymbol: '8',
        execute: (context) => context.caret.insert(DEGREE_SYMBOL),
    },
    {
        symbol: '≤',
        description: (l) => l.ui.tooltip.insertLessThanOrEqualSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        control: false,
        alt: true,
        key: 'Comma',
        keySymbol: ',',
        execute: (context) => context.caret.insert('≤'),
    },
    {
        symbol: '≥',
        keySymbol: '.',
        description: (l) => l.ui.tooltip.insertGreaterThanOrEqualSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        shift: false,
        control: false,
        alt: true,
        key: 'Period',
        execute: (context) => context.caret.insert('≥'),
    },
    {
        symbol: CONVERT_SYMBOL,
        description: (l) => l.ui.tooltip.insertConvertSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'ArrowRight',
        keySymbol: '→',
        execute: (context) => context.caret.insert(CONVERT_SYMBOL),
    },
    {
        symbol: STREAM_SYMBOL,
        description: (l) => l.ui.tooltip.insertStreamSymbol,
        visible: Visibility.Visible,
        category: Category.Insert,
        alt: true,
        shift: false,
        control: false,
        key: 'Semicolon',
        keySymbol: ';',
        execute: (context) => context.caret.insert(STREAM_SYMBOL),
    },
    {
        symbol: '⏎',
        description: (l) => l.ui.tooltip.insertLineBreak,
        visible: Visibility.Touch,
        category: Category.Modify,
        key: 'Enter',
        shift: false,
        alt: false,
        control: false,
        execute: (context) =>
            context.caret.isNode()
                ? context.caret.enter()
                : context.caret.insert('\n'),
    },
    // This is before back because it handles node selections.
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
    {
        symbol: '⌫',
        description: (l) => l.ui.tooltip.backspace,
        visible: Visibility.Touch,
        category: Category.Modify,
        key: 'Backspace',
        keySymbol: '⌫',
        shift: false,
        control: false,
        alt: false,
        execute: (context) => context.caret.backspace(),
    },
    {
        symbol: '📋',
        description: (l) => l.ui.tooltip.copy,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: true,
        shift: false,
        alt: false,
        key: 'KeyC',
        keySymbol: 'c',
        execute: (context) => {
            if (!(context.caret.position instanceof Node)) return undefined;
            return toClipboard(
                context.caret.position,
                context.caret.source.spaces
            );
        },
    },
    {
        symbol: '✂️',
        description: (l) => l.ui.tooltip.cut,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: true,
        shift: false,
        alt: false,
        key: 'KeyX',
        keySymbol: 'x',
        execute: (context) => {
            if (!(context.caret.position instanceof Node)) return undefined;
            toClipboard(context.caret.position, context.caret.source.spaces);
            return context.caret.backspace();
        },
    },
    {
        symbol: '📚',
        description: (l) => l.ui.tooltip.paste,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: true,
        shift: false,
        alt: false,
        key: 'KeyV',
        keySymbol: 'v',
        execute: async (context) => {
            // See if there's something on the clipboard.
            if (navigator.clipboard === undefined) return undefined;

            const items = await navigator.clipboard.read();
            for (const item of items) {
                for (const type of item.types) {
                    if (type === 'text/plain') {
                        const blob = await item.getType(type);
                        const text = await blob.text();
                        return context.caret.insert(text);
                    }
                }
            }
            return undefined;
        },
    },
    {
        symbol: '()',
        description: (l) => l.ui.tooltip.parenthesize,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: false,
        shift: undefined,
        alt: undefined,
        key: '(',
        active: (context) => context.caret.isNode(),
        execute: (context) => context.caret.wrap('('),
    },
    {
        symbol: '[]',
        description: (l) => l.ui.tooltip.enumerate,
        visible: Visibility.Visible,
        category: Category.Modify,
        control: undefined,
        shift: undefined,
        alt: undefined,
        key: '[',
        execute: (context) => context.caret.wrap('['),
    },
    {
        symbol: 'a',
        description: (l) => l.ui.tooltip.type,
        visible: Visibility.Invisible,
        category: Category.Modify,
        control: false,
        shift: undefined,
        alt: undefined,
        execute: (context, key) =>
            key.length === 1 ? context.caret.insert(key) : undefined,
    },
    {
        symbol: '↩',
        description: (l) => l.ui.tooltip.undo,
        visible: Visibility.Visible,
        category: Category.Modify,
        shift: false,
        control: true,
        alt: false,
        key: 'KeyZ',
        keySymbol: 'z',
        execute: (context) =>
            context.creator.undoProject(context.evaluator.project.id) === true,
    },
    {
        symbol: '↪',
        description: (l) => l.ui.tooltip.redo,
        visible: Visibility.Visible,
        category: Category.Modify,
        shift: true,
        control: true,
        alt: false,
        key: 'KeyZ',
        keySymbol: 'z',
        execute: (context) =>
            context.creator.redoProject(context.evaluator.project.id) === true,
    },
];

export default commands;
