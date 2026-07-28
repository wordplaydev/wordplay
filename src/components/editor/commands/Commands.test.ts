import { expect, test } from 'vitest';
import Commands, { Category, InsertSymbol } from './Commands';
import { THIS_SYMBOL, TRANSLATE_SYMBOL } from '@parser/Symbols';

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
    for (const [key, code] of [
        ['a', 'KeyA'],
        ['x', 'KeyX'],
        ['3', 'Digit3'],
    ]) {
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
            '⏯', // cycle evaluation mode → setUIMode
            '✏️', // edit mode → setUIMode
            '⏸', // step mode → setUIMode
            '▶', // play mode → setUIMode
        ].sort(),
    );
});
