import { expect, test } from 'vitest';
import UnicodeString from '@unicode/UnicodeString';

expect(new UnicodeString('🌷🎁💩😜👍🏳️‍🌈').getLength()).toBe(6);

test.each([
    ['happy', '!', 5, 'happy!'],
    ['happy', 's', 0, 'shappy'],
    ['happy', '!', 6, undefined],
])('Insert "%s" "%s" at %i', (start, insertion, position, result) => {
    const s = new UnicodeString(start);
    expect(s.withGraphemesAt(insertion, position)?.toString()).toBe(result);
});

test.each([
    ['happy', 0, 'appy'],
    ['', 0, undefined],
])('Remove grapheme', (start, position, result) => {
    const s = new UnicodeString(start);
    expect(s.withoutGraphemeAt(position)?.toString()).toBe(result);
});

// getGraphemes takes an ASCII fast path instead of Intl.Segmenter, because
// segmenting is the largest single cost in parsing a program. The fast path is
// only correct because CR LF is the one ASCII grapheme cluster longer than a
// character, so these check it against the Segmenter itself rather than against
// hand-written expectations.
const Segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const segmented = (text: string) =>
    Array.from(Segmenter.segment(text.normalize()), (s) => s.segment);

test.each([
    ['plain ascii', 'hello world'],
    ['ascii punctuation and digits', "a=1; b('x') /* ~! */ 42"],
    [
        'every printable ascii',
        String.fromCharCode(...Array(95).keys()).padStart(1),
    ],
    ['ascii with newlines and tabs', 'a\n\tb\n'],
    ['carriage return alone', 'a\rb'],
    ['CR LF is one cluster', 'a\r\nb'],
    ['CR LF only', '\r\n'],
    ['trailing CR', 'ab\r'],
    ['empty', ''],
    ['emoji', '🌷🎁💩😜👍🏳️‍🌈'],
    ['combining mark', 'é'],
    ['mixed ascii and emoji', 'say 👍 now'],
    ['keycap', '1️⃣'],
    ['hebrew with niqqud', 'בּוּעָה'],
    ['devanagari cluster', 'क्षि'],
])('getGraphemes matches Intl.Segmenter: %s', (_name, text) => {
    expect(new UnicodeString(text).getGraphemes()).toEqual(segmented(text));
});

// The boundary the fast path keys on: U+007F takes it, U+0080 does not, and both
// must agree with the Segmenter.
test('getGraphemes agrees at the ASCII boundary', () => {
    for (let code = 0; code <= 0x100; code++) {
        const text = `a${String.fromCharCode(code)}b`;
        expect(new UnicodeString(text).getGraphemes()).toEqual(segmented(text));
    }
});

// Caret and token positions count graphemes; a DOM text field's selection counts
// UTF-16 code units, and the editor's screen-reader mirror crosses that boundary
// (#1329). Check every boundary against the Segmenter rather than hand-written
// numbers, so a prefix of the string is exactly what the offset cuts.
test.each([
    ['empty', ''],
    ['plain ascii', 'hello world'],
    ['mixed ascii and emoji', 'say \u{1F44D} now'],
    ['the issue\u2019s repro', '\u{1F508}: 1'],
    [
        'emoji',
        '\u{1F337}\u{1F381}\u{1F4A9}\u{1F61C}\u{1F44D}\u{1F3F3}\uFE0F\u200D\u{1F308}',
    ],
    ['skin tone', '\u{1F44D}\u{1F3FD}'],
    ['keycap', '1\uFE0F\u20E3'],
    ['combining mark', 'e\u0301'],
    ['hebrew with niqqud', '\u05D1\u05BC\u05D5\u05BC\u05E2\u05B8\u05D4'],
    ['devanagari cluster', '\u0915\u094D\u0937\u093F'],
])('getCodeUnitPosition cuts at a grapheme boundary: %s', (_name, text) => {
    const string = new UnicodeString(text);
    const graphemes = segmented(text);
    for (let index = 0; index <= graphemes.length; index++)
        expect(
            string.toString().slice(0, string.getCodeUnitPosition(index)),
        ).toBe(graphemes.slice(0, index).join(''));
    // The ends specifically: nothing before the first boundary, everything before
    // the last one.
    expect(string.getCodeUnitPosition(0)).toBe(0);
    expect(string.getCodeUnitPosition(string.getLength())).toBe(
        string.toString().length,
    );
});

// A caller needs a number for setSelectionRange, so an out-of-range position
// clamps rather than returning undefined.
test('getCodeUnitPosition clamps out of range positions', () => {
    const string = new UnicodeString('\u{1F600}a');
    expect(string.getCodeUnitPosition(-1)).toBe(0);
    expect(string.getCodeUnitPosition(-100)).toBe(0);
    expect(string.getCodeUnitPosition(2)).toBe(3);
    expect(string.getCodeUnitPosition(3)).toBe(3);
    expect(string.getCodeUnitPosition(100)).toBe(3);
});
