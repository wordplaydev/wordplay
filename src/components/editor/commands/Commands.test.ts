import { describe, expect, test } from 'vitest';
import Commands, {
    Category,
    ModeDebug,
    ModeEdit,
    ModePlay,
    handleKeyCommand,
    InsertSymbol,
    keyMatches,
    USBaseCharacter,
    Visibility,
    type Command,
    type CommandContext,
    type Keystroke,
} from './Commands';
import { invalidKeys, overlappingChords, reservedChords } from './chords';
import * as AllCommandExports from './Commands';
import AllMarkupCommands from '@components/editor/markup/MarkupCommands';
import { isRecord } from '@util/guards';
import { isDefined } from '@util/nullable';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import {
    PATTERN_AHEAD_SYMBOL,
    PATTERN_ANY_SYMBOL,
    PATTERN_BEHIND_SYMBOL,
    PATTERN_DELIMITER_SYMBOL,
    PATTERN_END_SYMBOL,
    PATTERN_FOLD_SYMBOL,
    PATTERN_SPACE_SYMBOL,
    PATTERN_START_SYMBOL,
    PATTERN_WORD_SYMBOL,
    PATTERN_WORDEDGE_SYMBOL,
    CHANGE_SYMBOL,
    DEBUG_SYMBOL,
    EDIT_SYMBOL,
    PLAY_SYMBOL,
    STREAM_SYMBOL,
    THIS_SYMBOL,
    TRANSLATE_SYMBOL,
    TYPE_SYMBOL,
} from '@parser/Symbols';
import type { InsertContext } from '@edit/insertContext';
import { NoteDurations } from '@output/Music/durations';

// The GlyphInserter renders every Category.Insert command, so both new
// language symbols must be present as insert commands to be reachable there.
test.each([
    ['translate', TRANSLATE_SYMBOL],
    ['this', THIS_SYMBOL],
])('GlyphInserter offers the %s symbol', (_name, symbol) => {
    const command = Commands.find(
        (c) => c.category === Category.Insert && c.symbol === symbol,
    );
    expect(command, `expected an Insert command for ${symbol}`).toBeDefined();
});

// Regression: an unmodified plain keystroke must not match a palette-only
// insert command (no `key`, non-`typing`). Such commands previously matched
// every keystroke as a wildcard and clobbered it — once the pattern glyph
// inserts were added, typing anywhere inserted a `⣿⣿` pair. A no-key command is
// a keyboard wildcard ONLY when it's a `typing` catch-all. This replicates the
// matcher's predicate from handleKeyCommand so a regression there is caught.
function matchesUnmodified(
    command: (typeof Commands)[number],
    key: string,
    code: string,
): boolean {
    return (
        (command.control === undefined || command.control === false) &&
        (command.shift === undefined || command.shift === false) &&
        (command.alt === undefined || command.alt === false) &&
        ((command.key === undefined && command.typing === true) ||
            command.key === code ||
            command.key === key)
    );
}

test('an unmodified keystroke matches only the typing catch-all, not palette inserts', () => {
    const keystrokes: [key: string, code: string][] = [
        ['a', 'KeyA'],
        ['x', 'KeyX'],
        ['3', 'Digit3'],
    ];
    for (const [key, code] of keystrokes) {
        const matched = Commands.filter((c) => matchesUnmodified(c, key, code));
        // Every matching command must be a typing catch-all or have an explicit
        // matching key — never a no-key palette command.
        for (const c of matched)
            expect(
                c.typing === true || c.key === code || c.key === key,
                `command ${typeof c.symbol === 'string' ? c.symbol : '(fn)'} should not wildcard-match '${key}'`,
            ).toBe(true);
        // The typing catch-all must be among the matches so plain chars insert.
        expect(matched).toContain(InsertSymbol);
    }
});

/**
 * Every command must produce some audible result. Silence after a keystroke is
 * indistinguishable from a broken app for a screen reader user, and this is the
 * only place that can guarantee it for commands added later. Caret movements
 * and typing commands are covered by the editor's caret and echo announcements;
 * everything else declares how it's heard (see CommandFeedback).
 */
test('every command guarantees audible feedback', () => {
    const silent = Commands.filter(
        (command) =>
            command.category !== Category.Cursor &&
            command.typing !== true &&
            command.feedback === undefined,
    );
    expect(
        silent.map((command) => command.symbol),
        'these commands would do nothing audible; give each a `feedback`',
    ).toEqual([]);
});

/**
 * 'focus' and 'delegated' assert that something *else* speaks — a focused
 * element's label, or the state layer the command drives. That claim can't be
 * checked mechanically, so each use is enumerated here: adding one means
 * editing this list, which puts the claim in front of a reviewer.
 */
test('commands claiming external feedback are enumerated', () => {
    const external = Commands.filter(
        (command) =>
            command.feedback === 'focus' || command.feedback === 'delegated',
    ).map((command) => command.symbol);
    expect(external.sort()).toEqual(
        [
            // focus: opening the dialog moves focus, which reads its label
            '⌨', // keyboard help (bare codepoint, not the FE0F emoji)
            '\u2913', // save a value as a file → the export dialog
            // delegated: the state layer announces, so every entry point into
            // it (command, toolbar, settings dialog) sounds identical
            '⧠', // blocks/text editing mode → the blocks setting
            '▾', // autocomplete menu → the menu's own open/close
            '⏯', // toggle evaluation mode → setUIMode
            '✎', // edit mode → setUIMode (EDIT_SYMBOL, what the switcher draws)
            '⏸', // debug mode → setUIMode
            '▶', // play mode → setUIMode
            '⛶', // perform → performProject announces the fresh performance
        ].sort(),
    );
});

/**
 * Note values are palette-only and contextual: they are unreachable from the
 * character chooser (the quarter note has no entry in Unicode's name table at
 * all, so search can't find it), which is the whole reason they are commands.
 */
test('every note value has an insert command, offered only on a note', () => {
    for (const duration of NoteDurations) {
        const command = Commands.find(
            (c) => c.category === Category.Insert && c.symbol === duration.unit,
        );
        expect(
            command,
            `expected an Insert command for the ${duration.beats}-beat value`,
        ).toBeDefined();
        // Offered on a number in a note list, and nowhere else.
        expect(
            command?.where?.({ pattern: false, unit: true, noteList: true }),
        ).toBe(true);
        expect(
            command?.where?.({ pattern: false, unit: true, noteList: false }),
        ).toBe(false);
        expect(
            command?.where?.({ pattern: false, unit: false, noteList: true }),
        ).toBe(false);
    }
});

/**
 * Outside a `⣿…⣿` literal the tokenizer doesn't lex the pattern atoms as
 * pattern syms at all — they fall through to names — so offering them there
 * only produced garbage. `⣿` toggles the mode and `…` is the same glyph as the
 * stream symbol, so both stay available in either.
 */
test('pattern atoms are offered only inside a pattern', () => {
    const inPattern = { pattern: true, unit: false, noteList: false };
    const inCode = { pattern: false, unit: false, noteList: false };
    const offered = (context: InsertContext) =>
        Commands.filter(
            (c) =>
                c.category === Category.Insert &&
                (c.where ? c.where(context) : !context.pattern),
        ).map((c) => c.symbol);

    expect(offered(inPattern).sort()).toEqual(
        [
            PATTERN_DELIMITER_SYMBOL,
            STREAM_SYMBOL,
            PATTERN_ANY_SYMBOL,
            PATTERN_SPACE_SYMBOL,
            PATTERN_START_SYMBOL,
            PATTERN_END_SYMBOL,
            PATTERN_FOLD_SYMBOL,
            PATTERN_AHEAD_SYMBOL,
            PATTERN_BEHIND_SYMBOL,
            PATTERN_WORD_SYMBOL,
            PATTERN_WORDEDGE_SYMBOL,
        ].sort(),
    );

    const code = offered(inCode);
    expect(code).toContain(PATTERN_DELIMITER_SYMBOL);
    expect(code).toContain(STREAM_SYMBOL);
    expect(code).not.toContain(PATTERN_ANY_SYMBOL);
    expect(code).not.toContain(PATTERN_FOLD_SYMBOL);
    // And no note values, since ordinary code is not a note list.
    for (const duration of NoteDurations)
        expect(code).not.toContain(duration.unit);
});

/** A context with nothing in it a synthetic command would read. */
function emptyContext(): CommandContext {
    const project = Project.make(
        null,
        'test',
        new Source('test', '1'),
        [],
        DefaultLocale,
    );
    return {
        caret: undefined,
        editor: true,
        project,
        locales: DefaultLocales,
        evaluator: new Evaluator(project, DB, [DefaultLocale], false),
        database: DB,
        dragging: false,
        blocks: false,
        view: undefined,
        zoom: undefined,
    };
}

test('an inactive command consumes its shortcut, and a reason is returned to be said', () => {
    // `null` has always meant "greyed, but keep the keystroke from the browser".
    // A reason means the same, and travels out as a declined result so every
    // dispatch path can announce it — otherwise a greyed button's shortcut is
    // silent, which reads as broken.
    const reason = (l: typeof DefaultLocale) =>
        l.ui.markup.feedback.notInExample;
    let executed = 0;
    const make = (active: NonNullable<Command['active']>): Command => ({
        id: 'test-synthetic',
        symbol: '?',
        description: (l) => l.ui.markup.command.highlight,
        visible: Visibility.Invisible,
        category: Category.Modify,
        control: true,
        alt: false,
        shift: true,
        key: '8',
        feedback: 'caret',
        active,
        execute: () => {
            executed++;
            return true;
        },
    });
    const keystroke = {
        key: '8',
        code: 'Digit8',
        metaKey: false,
        ctrlKey: true,
        shiftKey: true,
        altKey: false,
    };
    const context = emptyContext();

    const declined = make(() => reason);
    expect(handleKeyCommand(keystroke, context, [declined])).toEqual([
        declined,
        reason,
        true,
    ]);
    const greyed = make(() => null);
    expect(handleKeyCommand(keystroke, context, [greyed])).toEqual([
        greyed,
        true,
        true,
    ]);
    expect(executed).toBe(0);

    // `false` still leaves the keystroke alone, and `true` still runs.
    expect(handleKeyCommand(keystroke, context, [make(() => false)])[0]).toBe(
        undefined,
    );
    expect(handleKeyCommand(keystroke, context, [make(() => true)])[1]).toBe(
        true,
    );
    expect(executed).toBe(1);
});

/**
 * The four defects these close had all shipped, and three of them were the
 * *second* instance of a class already fixed in the other command table. See
 * chords.ts for why none of this can be an end-to-end test.
 */

test('no two commands can match one keystroke', () => {
    expect(
        overlappingChords(Commands),
        'handleKeyCommand takes the first match, so the later command is unreachable',
    ).toEqual([]);
});

test("every command's key is a character or a named key, never a code", () => {
    expect(invalidKeys(Commands)).toEqual([]);
});

test('no command claims a chord the OS or browser takes first', () => {
    expect(reservedChords(Commands)).toEqual([]);
});

/**
 * The bindings that shipped dead, each kept as a case so the rule above has
 * something concrete to point at. Every one of these is a keystroke a real
 * browser produces and the old matcher refused.
 */
describe('the keystrokes that used to match nothing', () => {
    function press(
        key: string,
        code: string,
        modifiers: Partial<Keystroke> = {},
    ): Keystroke {
        return {
            key,
            code,
            metaKey: false,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            ...modifiers,
        };
    }

    /** The command a keystroke reaches, by symbol, ignoring the catch-all. */
    function matched(keystroke: Keystroke, commands: Command[]) {
        const found = commands.find(
            (command) =>
                command !== InsertSymbol &&
                (command.control === undefined ||
                    command.control ===
                        (keystroke.metaKey || keystroke.ctrlKey)) &&
                (command.shift === undefined ||
                    command.shift === keystroke.shiftKey) &&
                (command.alt === undefined ||
                    command.alt === keystroke.altKey) &&
                command.key !== undefined &&
                keyMatches(
                    command.key,
                    command.control === true || command.alt === true,
                    keystroke.key,
                    keystroke.key.toLowerCase(),
                    USBaseCharacter[keystroke.code],
                ),
        );
        return found?.symbol;
    }

    // #913: `∆` was keyed 'J', which is neither a code nor the key a real
    // Alt+j produces. It looked like it worked on macOS only because an
    // unmatched alt chord falls through and Option+j types ∆ by itself.
    test('Alt+j inserts the change symbol on every platform', () => {
        expect(matched(press('j', 'KeyJ', { altKey: true }), Commands)).toBe(
            CHANGE_SYMBOL,
        );
        // macOS rewrites the character, so the physical position answers.
        expect(matched(press('∆', 'KeyJ', { altKey: true }), Commands)).toBe(
            CHANGE_SYMBOL,
        );
        // And a dead key, which is what Option+e and friends deliver.
        expect(matched(press('Dead', 'KeyJ', { altKey: true }), Commands)).toBe(
            CHANGE_SYMBOL,
        );
    });

    // `≥` sat behind `·` on the identical chord and could never fire.
    test('Alt+. inserts greater-or-equal, which used to be unreachable', () => {
        expect(matched(press('.', 'Period', { altKey: true }), Commands)).toBe(
            '≥',
        );
    });

    /**
     * The physical fallback must not reach an unmodified command. `[` and `{`
     * are the same physical key, and both are Wordplay syntax — a list and a
     * set — so a `[` command that answered to the position would wrap a
     * selection in brackets every time someone opened a set.
     */
    test('an unmodified command answers to its character only', () => {
        expect(matched(press('[', 'BracketLeft'), Commands)).toBe('[ ]');
        expect(
            matched(press('{', 'BracketLeft', { shiftKey: true }), Commands),
        ).toBeUndefined();
        // Same for the parenthesis, whose key shares a digit.
        expect(
            matched(press('(', 'Digit9', { shiftKey: true }), Commands),
        ).toBe('( )');
        expect(matched(press('9', 'Digit9'), Commands)).toBeUndefined();
    });

    // A shifted digit's key is punctuation, so a command keyed '8' needs the
    // code to answer — and on AZERTY an unshifted digit needs Shift to type.
    test('a shifted digit still reaches its command', () => {
        expect(
            matched(
                press('*', 'Digit8', { ctrlKey: true, shiftKey: true }),
                Commands,
            ),
        ).toBeUndefined();
        // The type symbol no longer requires the digit to be unshifted, which
        // is what made it untypable on layouts where digits are shifted.
        expect(matched(press('8', 'Digit8', { altKey: true }), Commands)).toBe(
            TYPE_SYMBOL,
        );
        expect(
            matched(
                press('*', 'Digit8', { altKey: true, shiftKey: true }),
                Commands,
            ),
        ).toBe(TYPE_SYMBOL);
    });
});

/**
 * A symbol renders in the shortcut reference and on the command's own button, so
 * it must be a glyph a reader can match between the two — and it must render the
 * way the rest of the app's symbols do.
 */
describe('a command symbol is a glyph, not a colour emoji', () => {
    test('no symbol carries the colour presentation selector', () => {
        // U+FE0F forces the colour emoji font whatever family the element is
        // given, which defeats Emoji.svelte's monochrome default. Symbols.ts
        // declares the playback glyphs as bare codepoints for this reason; the
        // rule is the same for every command symbol.
        const coloured = [...Commands, ...AllMarkupCommands]
            .filter((command) => command.symbol.includes('️'))
            .map((command) => command.symbol);
        expect(coloured).toEqual([]);
    });

    test('the mode commands use the glyphs their switcher draws', () => {
        // The evaluation-mode switcher renders ProjectModeIcons; a command whose
        // symbol is a different character names a button nobody can find by it.
        expect(ModeEdit.symbol).toBe(EDIT_SYMBOL);
        expect(ModeDebug.symbol).toBe(DEBUG_SYMBOL);
        expect(ModePlay.symbol).toBe(PLAY_SYMBOL);
    });
});

/**
 * `Visibility.Invisible` has to mean "no button anywhere", because the shortcut
 * reference uses it to decide whether showing a symbol helps a reader find the
 * command or is a placeholder matching nothing. Seventeen commands were marked
 * Invisible while a view rendered them explicitly, which is what made the
 * reference show glyphs for buttons that don't exist.
 */
test('every explicitly rendered command says it has a button', () => {
    const sources = readdirSync('src/components/project')
        .filter((name) => name.endsWith('.svelte'))
        .map((name) =>
            readFileSync(join('src/components/project', name), 'utf8'),
        )
        .join('\n');
    const rendered = new Set(
        [...sources.matchAll(/command=\{([A-Z][A-Za-z]*)\}/g)]
            .map((m) => m[1])
            .filter(isDefined),
    );
    // Resolved by export name, which is what the markup names.
    const exported: Record<string, unknown> = AllCommandExports;
    const invisible = [...rendered].filter((name) => {
        const command = exported[name];
        return isRecord(command) && command.visible === Visibility.Invisible;
    });
    expect(
        invisible,
        'these are rendered as buttons but marked Invisible; use Visibility.Elsewhere',
    ).toEqual([]);
});

/**
 * A command's `id` is what a creator's stored keybinding override is keyed on,
 * so renaming one silently orphans their choice — the override stays in their
 * settings pointing at a command that no longer answers to it.
 *
 * Pinning the whole list is the cheapest way to make that a decision rather than
 * an accident: a rename shows up here as a diff a reviewer has to approve, and
 * adding a command is a one-line addition. Unknown ids are deliberately *kept*
 * when read back (see KeybindingsSetting), so a temporarily missing command
 * doesn't destroy a creator's other bindings.
 */
describe('command ids', () => {
    const all = [...Commands, ...AllMarkupCommands];

    test('are unique', () => {
        // Borrowed commands are the same object in both tables, so a duplicate
        // here means two different commands claimed one id.
        const ids = [...new Set(all)].map((command) => command.id);
        const repeated = ids.filter((id, i) => ids.indexOf(id) !== i);
        expect(repeated).toEqual([]);
    });

    test('are kebab-case and locale-independent', () => {
        expect(
            all.map((c) => c.id).filter((id) => !/^[a-z][a-z0-9-]*$/.test(id)),
        ).toEqual([]);
    });

    test('are stable', () => {
        expect([...new Set(all.map((c) => c.id))].sort()).toEqual([
            'backspace',
            'copy',
            'cut',
            'decrement-literal',
            'delete',
            'elide',
            'enter-fullscreen',
            'enumerate',
            'exit-fullscreen',
            'expand-after-inline',
            'expand-before-inline',
            'expand-next-line',
            'expand-prior-line',
            'export-value',
            'focus-cycle',
            'focus-docs',
            'focus-output',
            'focus-palette',
            'focus-source',
            'fold-all',
            'go-to-next-match',
            'increment-literal',
            'insert-borrow',
            'insert-change',
            'insert-convert',
            'insert-degree',
            'insert-docs',
            'insert-dot',
            'insert-dotted-eighth-note',
            'insert-dotted-half-note',
            'insert-dotted-quarter-note',
            'insert-dotted-sixteenth-note',
            'insert-dotted-whole-note',
            'insert-eighth-note',
            'insert-false',
            'insert-function',
            'insert-greater-or-equal',
            'insert-half-note',
            'insert-less-or-equal',
            'insert-line',
            'insert-none',
            'insert-not-equal',
            'insert-pattern',
            'insert-pattern-ahead',
            'insert-pattern-any',
            'insert-pattern-behind',
            'insert-pattern-end',
            'insert-pattern-fold',
            'insert-pattern-space',
            'insert-pattern-start',
            'insert-pattern-word',
            'insert-pattern-word-edge',
            'insert-previous',
            'insert-product',
            'insert-quarter-note',
            'insert-quotient',
            'insert-range',
            'insert-search',
            'insert-share',
            'insert-sixteenth-note',
            'insert-stream',
            'insert-symbol',
            'insert-tab',
            'insert-table-close',
            'insert-table-open',
            'insert-this',
            'insert-translate',
            'insert-true',
            'insert-type',
            'insert-whole-note',
            'line-end',
            'line-start',
            'markup-bold',
            'markup-char-expand-after-inline',
            'markup-char-expand-before-inline',
            'markup-char-next-inline',
            'markup-char-prior-inline',
            'markup-continue-bullet',
            'markup-document-source-end',
            'markup-document-source-start',
            'markup-extra',
            'markup-insert-attention',
            'markup-insert-docs',
            'markup-insert-example',
            'markup-insert-link',
            'markup-italic',
            'markup-light',
            'markup-redo-markup',
            'markup-toggle-bullet',
            'markup-toggle-defect',
            'markup-toggle-highlight',
            'markup-toggle-mode',
            'markup-underline',
            'markup-undo-markup',
            'markup-word-expand-after-inline',
            'markup-word-expand-before-inline',
            'markup-word-line-end',
            'markup-word-line-start',
            'markup-word-next-inline',
            'markup-word-prior-inline',
            'markup-word-select-all',
            'match-delimiter',
            'mode-debug',
            'mode-edit',
            'mode-play',
            'mode-toggle',
            'move-next-line',
            'move-prior-line',
            'next-inline',
            'next-node',
            'parent',
            'parenthesize',
            'paste',
            'perform',
            'prior-inline',
            'prior-node',
            'redo',
            'restart',
            'select-all',
            'show-keyboard-help',
            'show-menu',
            'source-end',
            'source-start',
            'step-back',
            'step-back-input',
            'step-back-node',
            'step-forward',
            'step-forward-input',
            'step-forward-node',
            'step-out',
            'step-to-present',
            'step-to-start',
            'tidy',
            'toggle-blocks',
            'toggle-search',
            'undo',
            'unfold-all',
            'zoom-in',
            'zoom-out',
        ]);
    });
});
