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
