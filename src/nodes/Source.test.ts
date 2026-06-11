import { expect, test } from 'vitest';
import Source from '@nodes/Source';

/** Extract [delimiterText, depth] pairs in token order for the structural
 * brackets the depth map tracks. */
function depthsOf(code: string): [string, number][] {
    const source = new Source('test', code);
    const depths = source.getDelimiterDepths();
    return source.tokens
        .filter((token) => depths.has(token))
        .map((token) => [token.getText(), depths.get(token) ?? -1]);
}

test('Nested same-type delimiters increase in depth, matching pairs share a depth', () => {
    expect(depthsOf('((()))')).toEqual([
        ['(', 0],
        ['(', 1],
        ['(', 2],
        [')', 2],
        [')', 1],
        [')', 0],
    ]);
});

test('Each delimiter type counts depth independently', () => {
    // The inner eval is depth 1 (nested in the outer eval), but the list stays
    // depth 0 — it is the first list, regardless of the enclosing parens.
    expect(depthsOf('([()])')).toEqual([
        ['(', 0],
        ['[', 0],
        ['(', 1],
        [')', 1],
        [']', 0],
        [')', 0],
    ]);
});

test('A different type nested inside another starts at its own depth 0', () => {
    expect(depthsOf('({})')).toEqual([
        ['(', 0],
        ['{', 0],
        ['}', 0],
        [')', 0],
    ]);
});

test('Sibling delimiters of the same type are both depth 0', () => {
    expect(depthsOf('()()')).toEqual([
        ['(', 0],
        [')', 0],
        ['(', 0],
        [')', 0],
    ]);
});

test('Unmatched closing delimiters clamp at depth 0', () => {
    expect(depthsOf('())')).toEqual([
        ['(', 0],
        [')', 0],
        [')', 0],
    ]);
});
