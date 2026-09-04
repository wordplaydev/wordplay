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
