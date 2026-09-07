import EditorCommands, {
    Category,
    InsertSymbol,
    Visibility,
    type Command,
    type CommandContext,
    type CommandResult,
} from '@components/editor/commands/Commands';
import Caret from '@edit/caret/Caret';
import {
    continueBullet,
    enclosingExample,
    insertAttention,
    moveByCharacter,
    moveByWord,
    insertDocs,
    insertExample,
    insertWebLink,
    toggleBullet,
    toggleDefect,
    toggleFormat,
    toggleHighlight,
} from '@edit/markup/formatOperations';
import { clampToMarkup, markupBounds } from '@edit/markup/markupSource';
import type { Format } from '@nodes/Words';
import {
    ATTENTION_SYMBOL,
    BOLD_SYMBOL,
    REDO_SYMBOL,
    UNDO_SYMBOL,
    BULLET_SYMBOL,
    CODE_SYMBOL,
    DEFECT_SYMBOL,
    DOCS_SYMBOL,
    EXTRA_SYMBOL,
    HIGHLIGHT_SYMBOL,
    ITALIC_SYMBOL,
    LIGHT_SYMBOL,
    UNDERSCORE_SYMBOL,
} from '@parser/Symbols';

/**
 * The markup editor's commands: the prose half of the editor's vocabulary.
 *
 * A separate list rather than additions to `Commands`, because the two editors
 * want different things from the same keys. Prose has no evaluator to step and no
 * literals to increment, so Control and Alt arrows are free for word and line
 * motion; and
 * the formatting shortcuts would be meaningless in code.
 *
 * Every edit command declares `feedback: 'delegated'` and the editor announces the
 * result from `describeMarkupChange`, which derives it by comparing the caret
 * before and after. That is what makes a toggle say "bold on" and then "bold off"
 * rather than the same words twice — the failure mode CLAUDE.md warns about — and
 * it makes the toolbar button and the shortcut sound identical.
 *
 * Shortcuts are carried over from the FormattedEditor this replaces, so nothing a
 * contributor already knows changes.
 */

/** Apply a markup operation to the context's caret, clamped inside the markup. */
function edit(
    context: CommandContext,
    operation: (caret: Caret) => [unknown, Caret] | undefined,
): CommandResult {
    const caret = context.caret;
    if (caret === undefined) return false;
    const result = operation(caret);
    if (result === undefined) return false;
    const revised = clampToMarkup(result[1]);
    return [revised.source, revised];
}

/** The five formatting runs, which differ only in their symbol, key, and word. */
const Formats: {
    format: Format;
    symbol: string;
    key: string;
    shift: boolean;
    description: Command['description'];
}[] = [
    {
        format: 'italic',
        symbol: ITALIC_SYMBOL,
        key: 'i',
        shift: false,
        description: (l) => l.ui.markup.command.italic,
    },
    {
        format: 'bold',
        symbol: BOLD_SYMBOL,
        key: 'b',
        shift: false,
        description: (l) => l.ui.markup.command.bold,
    },
    {
        format: 'extra',
        symbol: EXTRA_SYMBOL,
        key: 'e',
        shift: false,
        description: (l) => l.ui.markup.command.extra,
    },
    {
        format: 'underline',
        symbol: UNDERSCORE_SYMBOL,
        key: 'u',
        shift: false,
        description: (l) => l.ui.markup.command.underline,
    },
    {
        format: 'light',
        symbol: LIGHT_SYMBOL,
        key: 'l',
        shift: true,
        description: (l) => l.ui.markup.command.light,
    },
];

const FormatCommands: Command[] = Formats.map(
    ({ format, symbol, key, shift, description }) => ({
        symbol,
        description,
        visible: Visibility.Visible,
        category: Category.Modify,
        important: format !== 'light',
        control: true,
        alt: false,
        shift,
        key,
        feedback: 'delegated',
        execute: (context: CommandContext) =>
            edit(context, (caret) => toggleFormat(caret, format)),
    }),
);

/** Whether a caret is inside a `\…\` example. Exported on its own, rather than
 *  only as the `active` predicate below, so the toolbar can ask the question of a
 *  settled caret without assembling a whole `CommandContext`. */
export const caretIsInExample = (caret: Caret | undefined) =>
    caret !== undefined && enclosingExample(caret) !== undefined;

/** Commands that only mean something with the caret inside a `\…\` example. */
const inExample = (context: CommandContext) => caretIsInExample(context.caret);

const ContinueBullet: Command = {
    // Enter on a bulleted line continues the list. It shares the bullet
    // command's description because it is the same affordance reached a
    // second way, and it declines off a bulleted line so `InsertLine` — which
    // is further down the list — still inserts an ordinary line break.
    //
    // `typing` for the reason `InsertLine` is: the browser's own edit of the
    // mirrored field is what a screen reader echoes, so Enter sounds the same
    // here as it does anywhere else (#1248). Ending a list is a change of
    // state and `describeMarkupChange` announces that on top; continuing one
    // is just a new line, and the echo is the whole of what happened.
    symbol: BULLET_SYMBOL,
    description: (l) => l.ui.markup.command.bullet,
    visible: Visibility.Invisible,
    category: Category.Modify,
    control: false,
    alt: false,
    shift: false,
    key: 'Enter',
    typing: true,
    execute: (context) => edit(context, continueBullet),
};

const InsertExample: Command = {
    symbol: CODE_SYMBOL,
    description: (l) => l.ui.markup.command.example,
    visible: Visibility.Visible,
    category: Category.Insert,
    important: true,
    control: true,
    alt: false,
    shift: false,
    key: '\\',
    feedback: 'delegated',
    execute: (context) => edit(context, insertExample),
};

const InsertLink: Command = {
    symbol: '🔗',
    description: (l) => l.ui.markup.command.link,
    visible: Visibility.Visible,
    category: Category.Insert,
    important: true,
    control: true,
    alt: false,
    shift: false,
    key: 'k',
    feedback: { path: (l) => l.ui.markup.feedback.link },
    execute: (context) => edit(context, insertWebLink),
};

const ToggleBullet: Command = {
    symbol: BULLET_SYMBOL,
    description: (l) => l.ui.markup.command.bullet,
    visible: Visibility.Visible,
    category: Category.Modify,
    important: true,
    control: true,
    alt: false,
    shift: false,
    key: '8',
    feedback: 'delegated',
    execute: (context) => edit(context, toggleBullet),
};

const ToggleHighlight: Command = {
    symbol: HIGHLIGHT_SYMBOL,
    description: (l) => l.ui.markup.command.highlight,
    visible: Visibility.Visible,
    category: Category.Modify,
    control: true,
    alt: false,
    shift: true,
    key: '8',
    // Still `active` outside an example, so the keystroke is consumed and the
    // editor says why rather than doing nothing. The toolbar additionally
    // *hides* these four (see `MarkupToolbarGroups` and `MarkupToolbar`) — an
    // annotation is a statement about an example, and four permanently grey
    // buttons in prose read as broken rather than as unavailable.
    active: inExample,
    feedback: 'delegated',
    execute: (context) => edit(context, toggleHighlight),
};

const ToggleDefect: Command = {
    symbol: DEFECT_SYMBOL,
    description: (l) => l.ui.markup.command.defect,
    visible: Visibility.Visible,
    category: Category.Modify,
    control: true,
    alt: false,
    shift: true,
    key: '7',
    active: inExample,
    feedback: 'delegated',
    execute: (context) => edit(context, toggleDefect),
};

const InsertDocs: Command = {
    symbol: DOCS_SYMBOL,
    description: (l) => l.ui.markup.command.docs,
    visible: Visibility.Visible,
    category: Category.Insert,
    control: false,
    alt: true,
    shift: false,
    key: '7',
    // An explanation belongs inside an example, next to the code it explains.
    active: inExample,
    feedback: { path: (l) => l.ui.markup.feedback.docs },
    execute: (context) => edit(context, insertDocs),
};

const InsertAttention: Command = {
    symbol: ATTENTION_SYMBOL,
    description: (l) => l.ui.markup.command.attention,
    visible: Visibility.Visible,
    category: Category.Insert,
    control: true,
    alt: false,
    shift: true,
    key: '.',
    active: inExample,
    feedback: { path: (l) => l.ui.markup.feedback.attention },
    execute: (context) => edit(context, insertAttention),
};

const UndoMarkup: Command = {
    symbol: UNDO_SYMBOL,
    description: (l) => l.ui.markup.command.undo,
    visible: Visibility.Visible,
    category: Category.Modify,
    important: true,
    control: true,
    alt: false,
    shift: false,
    key: 'KeyZ',
    keySymbol: 'Z',
    active: (context) => context.canUndoMarkup?.() === true,
    feedback: { path: (l) => l.ui.markup.feedback.undid },
    execute: (context) => context.undoMarkup?.(-1) === true,
};

const RedoMarkup: Command = {
    symbol: REDO_SYMBOL,
    description: (l) => l.ui.markup.command.redo,
    visible: Visibility.Visible,
    category: Category.Modify,
    important: true,
    control: true,
    alt: false,
    shift: true,
    key: 'KeyZ',
    keySymbol: 'Z',
    active: (context) => context.canRedoMarkup?.() === true,
    feedback: { path: (l) => l.ui.markup.feedback.redid },
    execute: (context) => context.undoMarkup?.(1) === true,
};

const ToggleMode: Command = {
    symbol: '👁',
    description: (l) => l.ui.markup.command.mode,
    visible: Visibility.Visible,
    category: Category.Cursor,
    important: true,
    control: true,
    alt: undefined,
    shift: undefined,
    key: 'Enter',
    // The mode layer announces which mode was entered, so every way in
    // sounds the same.
    feedback: 'delegated',
    execute: (context) => {
        if (context.toggleMarkupMode === undefined) return false;
        context.toggleMarkupMode();
        return true;
    },
};

/**
 * The toolbar's groups, in the order it offers them, separated by a rule.
 *
 * This is also the source of truth for the command list itself: dispatch order
 * *within* the markup commands doesn't matter, because no two of them share a
 * shortcut (`MarkupCommands.test.ts` asserts it), so one ordering serves both and
 * the toolbar can never drift from what the keyboard dispatches.
 *
 * Undo and redo lead, the way every editor's toolbar leads with them. The example
 * button sits with the annotations it produces rather than with the formatting,
 * since `⭐` and `🪲` say something about an example and nothing about prose.
 */
/** The prose/source switch, which the toolbar renders as a stateful toggle
 *  rather than a button: it has two modes and a button shows neither. */
export { ToggleMode as MarkupModeCommand };

export const ExampleOnlyCommands: Command[] = [
    ToggleHighlight,
    ToggleDefect,
    InsertDocs,
    InsertAttention,
];

export const MarkupToolbarGroups: Command[][] = [
    [UndoMarkup, RedoMarkup],
    [...FormatCommands, ToggleBullet, InsertLink],
    [InsertExample, ToggleHighlight, ToggleDefect],
    [InsertDocs, InsertAttention],
    [ToggleMode],
];

const MarkupCommands: Command[] = [
    // Invisible, so it belongs to no group: Enter continuing a bullet is the same
    // affordance as the bullet button, reached a second way.
    ContinueBullet,
    ...MarkupToolbarGroups.flat(),
];

/** Move or extend the caret one character, in the reader's writing direction. */
function moveCaret(
    context: CommandContext,
    towardEnd: -1 | 1,
    extend: boolean,
): CommandResult {
    const caret = context.caret;
    if (caret === undefined) return false;
    // An arrow means "the way text runs", so it flips with the writing direction,
    // exactly as the code editor's inline motion does.
    const direction: -1 | 1 =
        context.database.Locales.getWritingDirection() === 'ltr'
            ? towardEnd
            : towardEnd === -1
              ? 1
              : -1;
    const result = moveByCharacter(caret, direction, extend);
    return result === undefined ? false : result;
}

/** Put the caret at the start or end of the markup, inside the `¶` wrapper. */
function atBound(caret: Caret | undefined, end: 0 | 1): CommandResult {
    if (caret === undefined) return false;
    const bounds = markupBounds(caret.source);
    return [
        caret.source,
        new Caret(caret.source, bounds[end], undefined, undefined),
    ];
}

/**
 * Control+Home and Control+End, which every text field has and the code editor
 * does not — it binds start-of-source to PageUp/PageDown instead, and leaves
 * Control+Home to the timeline's "step to the beginning".
 *
 * Binding them here is not only an affordance: an unmatched keystroke bubbles out
 * of the editor by design (so the app's global shortcuts still work from inside
 * one), and in the chat composer Control+Home reached the timeline, which stepped
 * the evaluator, remounted the composer, and discarded the message being written.
 *
 * The descriptions are the code editor's own `sourceStart`/`sourceEnd`, already
 * translated everywhere, since they say exactly what these do.
 */
const DocumentMotionCommands: Command[] = [
    {
        symbol: '⤒',
        description: (l) => l.ui.source.cursor.sourceStart,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: false,
        control: true,
        shift: false,
        key: 'Home',
        keySymbol: '⇤',
        feedback: 'caret',
        execute: ({ caret }) => atBound(caret, 0),
    },
    {
        symbol: '⤓',
        description: (l) => l.ui.source.cursor.sourceEnd,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: false,
        control: true,
        shift: false,
        key: 'End',
        keySymbol: '⇥',
        feedback: 'caret',
        execute: ({ caret }) => atBound(caret, 1),
    },
];

/** Move or extend the caret one word, in the reader's writing direction. */
function moveWord(
    context: CommandContext,
    towardEnd: -1 | 1,
    extend: boolean,
): CommandResult {
    const caret = context.caret;
    if (caret === undefined) return false;
    const direction: -1 | 1 =
        context.database.Locales.getWritingDirection() === 'ltr'
            ? towardEnd
            : towardEnd === -1
              ? 1
              : -1;
    const result = moveByWord(
        caret,
        direction,
        extend,
        context.locales.getLocaleString(),
    );
    return result === undefined ? false : result;
}

/**
 * Word motion (Alt/Option+Arrow) and line-boundary motion (Control/Command+Arrow).
 *
 * Neither exists in the code editor: Alt+Arrow there inserts a symbol and
 * Control+Arrow steps the evaluator, both `Category.Insert`/`Evaluate` and so
 * never reaching this list. Binding Control+Arrow matters for a second reason
 * beyond the affordance — an unmatched chord bubbles out of the editor by design
 * so the app's global shortcuts keep working from inside one, and Control+Arrow
 * is the timeline's step, which remounts the chat composer and discards the
 * message being written. Same defect as Control+Home. It is bound to the line
 * boundary rather than to word motion because `handleKeyCommand` folds Command
 * into Control, and Command+Arrow is the line boundary on macOS — where there
 * are no Home and End keys at all.
 */
const WordMotionCommands: Command[] = [
    {
        symbol: '⇠',
        description: (l) => l.ui.source.cursor.priorInline,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: true,
        control: false,
        shift: false,
        key: 'ArrowLeft',
        keySymbol: '←',
        feedback: 'caret',
        execute: (context) => moveWord(context, -1, false),
    },
    {
        symbol: '⇠☐',
        description: (l) => l.ui.source.cursor.expandBeforeInline,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: true,
        control: false,
        shift: true,
        key: 'ArrowLeft',
        keySymbol: '←',
        feedback: 'caret',
        execute: (context) => moveWord(context, -1, true),
    },
    {
        symbol: '⇢',
        description: (l) => l.ui.source.cursor.nextInline,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: true,
        control: false,
        shift: false,
        key: 'ArrowRight',
        keySymbol: '→',
        feedback: 'caret',
        execute: (context) => moveWord(context, 1, false),
    },
    {
        symbol: '☐⇢',
        description: (l) => l.ui.source.cursor.expandAfterInline,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: true,
        control: false,
        shift: true,
        key: 'ArrowRight',
        keySymbol: '→',
        feedback: 'caret',
        execute: (context) => moveWord(context, 1, true),
    },
    {
        symbol: '⇤',
        description: (l) => l.ui.source.cursor.lineStart,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: false,
        control: true,
        shift: false,
        key: 'ArrowLeft',
        keySymbol: '←',
        feedback: 'caret',
        execute: ({ caret }) => caret?.atLineBoundary(true) ?? false,
    },
    {
        symbol: '⇥',
        description: (l) => l.ui.source.cursor.lineEnd,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: false,
        control: true,
        shift: false,
        key: 'ArrowRight',
        keySymbol: '→',
        feedback: 'caret',
        execute: ({ caret }) => caret?.atLineBoundary(false) ?? false,
    },
    {
        // Select the markup, never the `¶` wrapper. The code editor's select-all
        // returns a NODE position naming the whole program, which `clampToMarkup`
        // passes through untouched, `CaretView` renders as `visibility: hidden`,
        // and the selection outline — which requires a range — draws not at all.
        // So Control+A appeared to do nothing whatsoever.
        symbol: '⬚',
        description: (l) => l.ui.source.cursor.selectAll,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: false,
        control: true,
        shift: false,
        key: 'KeyA',
        keySymbol: 'A',
        feedback: 'caret',
        execute: ({ caret }) => {
            if (caret === undefined) return false;
            const [low, high] = markupBounds(caret.source);
            if (low === high) return false;
            return [
                caret.source,
                new Caret(caret.source, [low, high], undefined, undefined),
            ];
        },
    },
];

/**
 * Left and right, and their shift-extended forms.
 *
 * These are the one part of caret motion prose cannot borrow. The code editor's
 * arrows call `moveInlineText`, which selects the *node* the caret steps onto —
 * the right affordance for picking out a subexpression, and a bewildering one in
 * a paragraph. The `¶` wrapper makes it certain rather than occasional: the end
 * of the text is always a token boundary, so a single ArrowLeft from the end
 * selected the whole sentence, and the Shift+ArrowLeft after it then extended by
 * node, wrapping an entire paragraph in `*` where the creator had selected a
 * word. Line motion, Home and End mean the same thing in both and are borrowed
 * unchanged; word motion does not exist in the code editor at all (see
 * `WordMotionCommands`).
 *
 * The descriptions and key bindings are the code editor's, so the shortcuts are
 * identical and the announcements stay localized in all 30 locales.
 */
const CharacterMotionCommands: Command[] = [
    {
        symbol: '←',
        description: (l) => l.ui.source.cursor.priorInline,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'ArrowLeft',
        keySymbol: '←',
        feedback: 'caret',
        execute: (context) => moveCaret(context, -1, false),
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
        feedback: 'caret',
        execute: (context) => moveCaret(context, -1, true),
    },
    {
        symbol: '→',
        description: (l) => l.ui.source.cursor.nextInline,
        visible: Visibility.Invisible,
        category: Category.Cursor,
        alt: false,
        control: false,
        shift: false,
        key: 'ArrowRight',
        keySymbol: '→',
        feedback: 'caret',
        execute: (context) => moveCaret(context, 1, false),
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
        feedback: 'caret',
        execute: (context) => moveCaret(context, 1, true),
    },
];

/**
 * Caret motion and selection, borrowed wholesale from the code editor. These are
 * pure `Caret` operations over a `Source` — line motion, Home and End, node
 * selection, and their shift-extended forms — so they mean the same thing in
 * prose as in code, and reusing them keeps their localized descriptions and their
 * announcements rather than inventing a second set that would drift. The lists
 * above shadow the four inline arrows and add the word motion and select-all the
 * code editor has no equivalent of.
 *
 * Only `Category.Cursor`: the code editor's other categories are things prose has
 * no use for (stepping the evaluator, folding a block) or would be wrong for it.
 */
const MotionCommands = EditorCommands.filter(
    (command) => command.category === Category.Cursor,
);

/**
 * The `Category.Modify` commands prose needs, taken by key rather than wholesale,
 * because that category is mostly code-shaped edits.
 *
 * Taking them by an allow-list has now been wrong twice — once for undo, once for
 * Enter — so here is the whole category and why each is in or out:
 *
 * IN
 *   Enter        insert a line. Without it Enter did nothing at all and every
 *                paragraph ran into the next, which is most of what prose is.
 *   Backspace    delete backward.
 *   Delete       delete forward.
 *   Ctrl+X/C/V   cut, copy, paste. A text field without them is not a text field.
 *
 * OUT, deliberately
 *   Ctrl+\       blocks mode — meaningless here, and the markup commands claim
 *                Ctrl+\ for a code example, which is first in the list and wins.
 *   Ctrl+8       elision — same collision with the bullet command, same resolution.
 *   Ctrl+Z       undo/redo, which go through `Projects.getHistory` and find
 *                nothing for a scratch project; the markup editor has its own.
 *   `(` and `[`  parenthesize and enumerate. These fire on an UNMODIFIED key, so
 *                including them would make typing a bracket in prose wrap the
 *                surrounding text instead of inserting a character.
 *   Ctrl+S       tidy, which reformats code.
 */
const ModifyKeys = new Set([
    'Enter',
    'Backspace',
    'Delete',
    'KeyX',
    'KeyC',
    'KeyV',
]);
const DeleteCommands = EditorCommands.filter(
    (command) =>
        command.category === Category.Modify &&
        command.key !== undefined &&
        ModifyKeys.has(command.key) &&
        // Undo and redo are `KeyZ`, but this guard also keeps a future Modify
        // command that reuses one of these keys from arriving unnoticed.
        command.description !== undefined,
);

/**
 * The dispatch order is the precedence order, since `handleKeyCommand` takes the
 * first match. The markup commands come first so their shortcuts win where they
 * collide with the code editor's (Control+Enter is the mode toggle here), and
 * `InsertSymbol` — the typing catch-all — comes last so it can never shadow a
 * real command.
 */
const AllMarkupCommands: Command[] = [
    ...MarkupCommands,
    ...CharacterMotionCommands,
    ...WordMotionCommands,
    ...DocumentMotionCommands,
    ...MotionCommands,
    ...DeleteCommands,
    InsertSymbol,
];

/** The commands the toolbar offers, in the order it offers them. */
export const VisibleMarkupCommands = MarkupCommands.filter(
    (c) => c.visible === Visibility.Visible,
);

/** The markup-specific commands alone, for the invariant tests. */
export { MarkupCommands as MarkupOnlyCommands };

export default AllMarkupCommands;
