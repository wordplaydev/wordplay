import { analyzeDelimiters } from '#parser/delimiterRecovery.ts';
import { tokenize } from '#parser/Tokenizer.ts';
import { expect, test } from 'vitest';

/** The text of each stray close, and each unclosed open paired with the token it stops before. */
function recover(code: string) {
    const list = tokenize(code);
    const { stray, boundary } = analyzeDelimiters(
        list.getTokens(),
        list.getSpaces(),
        list.getLexical(),
    );
    return {
        stray: [...stray].map((token) => token.getText()),
        boundary: [...boundary].map(
            ([open, stop]) => `${open.getText()} → ${stop.getText()}`,
        ),
    };
}

test.each([
    ['f(1 [2 3] {4})'],
    ['f(\n\t[\n\t\t1\n\t]\n)\na: 1'],
    // Flush left, so every line is a candidate until the close arrives.
    ['f(\n1\n2\n)\na: 1'],
    // Brackets in text, interpolations, docs and their examples are not structure.
    ["f('(' ')')"],
    ["f('a \\g(1)\\ b')"],
    ["f('a \\g('b \\h(1)\\')\\')"],
    ['¶a ( doc \\f(1)\\ with ] brackets¶\nf(1)'],
    ['f(¶a ) doc¶ 1)'],
    ['`formatted ( text`'],
])('balanced code needs no recovery: %s', (code) => {
    expect(recover(code)).toEqual({ stray: [], boundary: [] });
});

test('an unclosed delimiter ends at the first line indented no deeper than its own', () => {
    expect(recover('f(1\n\t2\na: 1').boundary).toEqual(['( → a']);
    // The closes of what it contains are not where it ends.
    expect(recover('f([\n\t1\n]\na: 1').boundary).toEqual(['( → a']);
    // Nothing follows on a later line, so it ends with the source.
    expect(recover('f(1 2').boundary).toEqual([]);
});

test('a close for an outer delimiter leaves the inner ones unclosed', () => {
    const { stray, boundary } = recover('[\n\tf(1\n\tg(2)\n]');
    expect(stray).toEqual([]);
    expect(boundary).toEqual(['( → g']);
});

test('a close with nothing to close is stray', () => {
    expect(recover('f 1)').stray).toEqual([')']);
    expect(recover('[1 2]]').stray).toEqual([']']);
});

test('layout decides whether a mismatched close lacks its open', () => {
    // The `]` leads a line indented like the line of `f(`, which it would leave unclosed.
    // What it lacks is its open, which belongs before the lines it closes.
    const list = tokenize('[\n\tf(1\n\t\t2\n\t])\n]');
    const { stray, boundary, missing } = analyzeDelimiters(
        list.getTokens(),
        list.getSpaces(),
        list.getLexical(),
    );
    expect(stray.size + boundary.size).toBe(0);
    expect([...missing.keys()].map((token) => token.getText())).toEqual(['2']);
    // The `)` trails a line after the one `f(` is on, so it is that line's own.
    expect(recover('f([\n\tg 1)\n])')).toEqual({ stray: [')'], boundary: [] });
    // On one line there is no layout to consult, so the inner delimiter is the unclosed
    // one, and it ends at the close that wasn't its own.
    expect(recover('f([1 2)')).toEqual({ stray: [], boundary: ['[ → )'] });
});

test('an example is its own scope', () => {
    // The `(` in the example is unclosed, and the program's `)` is not its close.
    expect(recover('f(¶an \\g(\\ example¶ 1)')).toEqual({
        stray: [],
        boundary: ['( → \\'],
    });
});
