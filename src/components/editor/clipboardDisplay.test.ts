import { parseClipboardCode } from '@components/editor/clipboardDisplay';
import { expect, test } from 'vitest';

test.each([
    ['1 + 2', true],
    ['Phrase("hi")', true],
    ['a: 1\na + 2', true],
    // Incomplete / unparsable fragments fall back to plain text.
    ['1 +', false],
    ['@@@ ###', false],
    // Empty/whitespace is not code.
    ['', false],
    ['   ', false],
])('parseClipboardCode(%j).isCode === %s', (text: string, expected: boolean) => {
    expect(parseClipboardCode(text).isCode).toBe(expected);
});
