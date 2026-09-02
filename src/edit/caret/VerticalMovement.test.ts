import Caret from '@edit/caret/Caret';
import type { LocaleTextAccessor } from '@locale/Locales';
import Node from '@nodes/Node';
import Source from '@nodes/Source';
import Token from '@nodes/Token';
import { expect, test } from 'vitest';

/** A caret at a text position in the given code. */
function at(code: string, position: number) {
    return new Caret(new Source('test', code), position, undefined, undefined);
}

/** The index a move landed on, or 'refused' when it declined with a reason. */
function landed(result: Caret | LocaleTextAccessor): number | string {
    if (typeof result === 'function') return 'refused';
    const position = result.position;
    if (typeof position === 'number') return position;
    if (Array.isArray(position)) return position[1];
    return result.source.getNodeFirstPosition(position) ?? -1;
}

test('a line step keeps the column', () => {
    //     0123 4567 89
    //     ab\ncd\nef
    // Column 1 of line 1 is index 4; one line up is index 1, one down is 7.
    expect(landed(at('ab\ncd\nef', 4).moveLineVertical(-1, false))).toBe(1);
    expect(landed(at('ab\ncd\nef', 4).moveLineVertical(1, false))).toBe(7);
});

test('a line step clamps onto a shorter line', () => {
    // 'abcde\nx\nabcde' — column 4 of line 0 has nowhere to go on line 1.
    const code = 'abcde\nx\nabcde';
    // Line 1 runs [6,7], so column 4 clamps to its end.
    expect(landed(at(code, 4).moveLineVertical(1, false))).toBe(7);
});

test('up on the first line goes to the start of the source', () => {
    // The behavior every other editor has, and what the caret does with PageUp.
    expect(landed(at('ab\ncd', 1).moveLineVertical(-1, false))).toBe(0);
});

test('down on the last line goes to the end of the source', () => {
    expect(landed(at('ab\ncd', 4).moveLineVertical(1, false))).toBe(5);
});

test('a move refuses only once there is genuinely nowhere to go', () => {
    // Already at the start: up has nothing left, so it says so rather than
    // returning a caret that didn't move.
    expect(landed(at('ab\ncd', 0).moveLineVertical(-1, false))).toBe('refused');
    expect(landed(at('ab\ncd', 5).moveLineVertical(1, false))).toBe('refused');
});

test('an empty program refuses rather than doing nothing', () => {
    expect(landed(at('', 0).moveLineVertical(-1, false))).toBe('refused');
    expect(landed(at('', 0).moveLineVertical(1, false))).toBe('refused');
});

test('a blocks-mode step lands only where horizontal movement can reach', () => {
    // This is the invariant the rendered row model broke: a vertical landing
    // must be a position getBlockPositions() offers, or the caret ends up
    // somewhere the arrow keys can't get back to.
    const source = new Source('test', "Phrase('a')\nPhrase('b')");
    const positions = new Set(
        new Caret(source, 0, undefined, undefined)
            .getBlockPositions()
            .map((p) =>
                typeof p === 'number' ? p : source.getNodeFirstPosition(p),
            ),
    );
    for (let start = 0; start <= source.getCode().getLength(); start++) {
        for (const direction of [-1, 1] as const) {
            const result = new Caret(
                source,
                start,
                undefined,
                undefined,
            ).moveLineVertical(direction, true);
            if (typeof result === 'function') continue;
            const where = landed(result);
            expect(
                positions.has(typeof where === 'number' ? where : -1),
                `landed at ${where} moving ${direction} from ${start}`,
            ).toBe(true);
        }
    }
});

test('the end of a program can move up — the reported failure', () => {
    // A program of line-separated Phrases with no trailing newline. The caret at
    // the very end sits past every editable token, which is what left the
    // rendered row model unable to find a row to move from.
    const code = "Phrase('a')\nPhrase('b')\nPhrase('c')";
    const source = new Source('test', code);
    const caret = new Caret(
        source,
        source.getCode().getLength(),
        undefined,
        undefined,
    );
    const result = caret.moveLineVertical(-1, true);
    expect(typeof result).not.toBe('function');
    const where = landed(result);
    // It moved, and it moved to the line above rather than to the start.
    expect(typeof where).toBe('number');
    expect(source.getLine(where as number)).toBe(1);
});

test('expanding a line keeps the anchor and moves the other end', () => {
    const result = at('ab\ncd\nef', 1).expandLineVertical(1);
    expect(typeof result).not.toBe('function');
    if (typeof result === 'function') return;
    expect(result.position).toEqual([1, 4]);
});

test('an expansion that returns to its anchor collapses', () => {
    // A zero-width range renders neither a caret bar nor a highlight, so it
    // must become a plain position instead.
    const source = new Source('test', 'ab\ncd');
    const expanded = new Caret(source, [1, 4], undefined, undefined);
    const result = expanded.expandLineVertical(-1);
    if (typeof result === 'function') throw new Error('refused');
    expect(result.position).toBe(1);
});

test('expanding past the last line reaches the end of the source', () => {
    const result = at('ab\ncd', 1).expandLineVertical(1);
    if (typeof result === 'function') throw new Error('refused');
    expect(result.position).toEqual([1, 4]);
    const further = result.expandLineVertical(1);
    if (typeof further === 'function') throw new Error('refused');
    expect(further.position).toEqual([1, 5]);
});

test('selecting the token node gives blocks mode something to extend from', () => {
    const source = new Source('test', '1\n2\n3');
    // Inside the first number token.
    const result = new Caret(source, 1, undefined, undefined).selectTokenNode();
    if (typeof result === 'function') throw new Error('refused');
    expect(result.position).toBeInstanceOf(Node);
});

test('selecting the token node never selects the program end token', () => {
    // The end token has no text, so selecting it selects nothing visible.
    const source = new Source('test', '1\n2');
    const result = new Caret(
        source,
        source.getCode().getLength(),
        undefined,
        undefined,
    ).selectTokenNode();
    if (typeof result === 'function') throw new Error('refused');
    const position = result.position;
    expect(position).toBeInstanceOf(Node);
    if (position instanceof Node) {
        const leaves = position.leaves();
        expect(leaves[leaves.length - 1]).not.toBe(
            source.tokens[source.tokens.length - 1],
        );
    }
});

test('every navigable blocks position lies inside some token', () => {
    // The premise the rendered row model has to satisfy: it builds its rows from
    // token spans, so a navigable position outside every token is a position
    // vertical movement cannot find a row for. This failed on the end of a
    // program ending in a delimiter, which is the reported bug.
    for (const code of [
        "Phrase('a')\nPhrase('b')",
        '1\n2\n3',
        '[1 2 3]',
        "Phrase('a')\n",
        'ƒ add(a•# b•#) a + b',
        '(1\n2)\n3',
    ]) {
        const source = new Source('test', code);
        const spans = source
            .leaves()
            .filter((t): t is Token => t instanceof Token)
            .map((t) => [
                source.getTokenTextPosition(t),
                source.getTokenLastPosition(t),
            ]);
        const uncovered = new Caret(source, 0, undefined, undefined)
            .getBlockPositions()
            .filter((p): p is number => typeof p === 'number')
            .filter(
                (p) =>
                    !spans.some(
                        ([start, end]) =>
                            start !== undefined &&
                            end !== undefined &&
                            p >= start &&
                            p <= end,
                    ),
            );
        expect(uncovered, `in ${JSON.stringify(code)}`).toEqual([]);
    }
});
