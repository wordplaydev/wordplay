import { expect, test } from 'vitest';
import { locateGraphemeOffset } from './measureTokenSegment';

// TokenView splits an emoji-bearing token across several text nodes (each emoji
// run gets its own span), which is what the old single-text-node lookup missed:
// an emoji-only token has no direct child text node at all, so its measured
// width was 0 and the selection outline was dropped entirely.
const split = ['ab', '😀', 'cd'];

test('an offset inside the first node resolves within it', () => {
    expect(locateGraphemeOffset(split, 0)).toEqual({ index: 0, codeUnit: 0 });
    expect(locateGraphemeOffset(split, 1)).toEqual({ index: 0, codeUnit: 1 });
});

test('an offset at a node boundary resolves to the start of the next node', () => {
    expect(locateGraphemeOffset(split, 2)).toEqual({ index: 1, codeUnit: 0 });
    // Past the emoji: index 3 is the start of 'cd', not an offset inside 😀.
    expect(locateGraphemeOffset(split, 3)).toEqual({ index: 2, codeUnit: 0 });
});

test('an offset inside the last node resolves within it', () => {
    expect(locateGraphemeOffset(split, 4)).toEqual({ index: 2, codeUnit: 1 });
});

test('the total length resolves to the end of the last node', () => {
    // 'ab' + 😀 + 'cd' is 5 graphemes; 'cd' is 2 code units.
    expect(locateGraphemeOffset(split, 5)).toEqual({ index: 2, codeUnit: 2 });
});

test('an offset past the end clamps rather than failing', () => {
    expect(locateGraphemeOffset(split, 99)).toEqual({ index: 2, codeUnit: 2 });
});

test('an emoji-only token measures its whole width', () => {
    // The case that rendered no selection at all: one span, no sibling text.
    expect(locateGraphemeOffset(['😀'], 0)).toEqual({ index: 0, codeUnit: 0 });
    expect(locateGraphemeOffset(['😀'], 1)).toEqual({ index: 0, codeUnit: 2 });
});

test('a ZWJ sequence counts as one grapheme', () => {
    // 👨‍💻 is 5 code units (two surrogate pairs plus a ZWJ) but one grapheme.
    const zwj = '👨‍💻';
    expect(zwj.length).toBe(5);
    expect(locateGraphemeOffset([zwj], 1)).toEqual({ index: 0, codeUnit: 5 });
});

test('a keycap sequence counts as one grapheme', () => {
    // 1 + FE0F + 20E3, which the keycap face shapes as a single glyph.
    const keycap = '1️⃣';
    expect(locateGraphemeOffset([keycap, 'x'], 1)).toEqual({
        index: 1,
        codeUnit: 0,
    });
});

test('no text nodes yields undefined', () => {
    expect(locateGraphemeOffset([], 0)).toBeUndefined();
});
