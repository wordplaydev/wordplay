import { expect, test } from 'vitest';
import Commands, {
    Category,
    handleKeyCommand,
    InsertSymbol,
    Visibility,
    type Command,
    type CommandContext,
} from './Commands';
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
    STREAM_SYMBOL,
    THIS_SYMBOL,
    TRANSLATE_SYMBOL,
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
            '⌨️', // keyboard help
            // delegated: the state layer announces, so every entry point into
            // it (command, toolbar, settings dialog) sounds identical
            '⧠', // blocks/text editing mode → the blocks setting
            '▾', // autocomplete menu → the menu's own open/close
            '⏯', // toggle evaluation mode → setUIMode
            '✏️', // edit mode → setUIMode
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
