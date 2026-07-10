import {
    MAX_CLIPBOARD_PREVIEW_STATEMENTS,
    parseClipboardCode,
} from '@components/editor/clipboardDisplay';
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

test('a sequence of more than the cap is truncated to the first few statements', () => {
    const parsed = parseClipboardCode('1\n2\n3\n4\n5');
    expect(parsed.isCode).toBe(true);
    expect(parsed.source.expression.expression.statements).toHaveLength(
        MAX_CLIPBOARD_PREVIEW_STATEMENTS,
    );
    expect(parsed.hidden).toBe(5 - MAX_CLIPBOARD_PREVIEW_STATEMENTS);
});

test('a sequence within the cap is not truncated', () => {
    const parsed = parseClipboardCode('1\n2\n3');
    expect(parsed.isCode).toBe(true);
    expect(parsed.source.expression.expression.statements).toHaveLength(3);
    expect(parsed.hidden).toBe(0);
});

test('a single large node is not a sequence and is not truncated', () => {
    const parsed = parseClipboardCode('[1 2 3 4 5 6 7 8 9 10]');
    expect(parsed.isCode).toBe(true);
    expect(parsed.source.expression.expression.statements).toHaveLength(1);
    expect(parsed.hidden).toBe(0);
});

test('non-code text is never truncated', () => {
    const parsed = parseClipboardCode('1 +');
    expect(parsed.isCode).toBe(false);
    expect(parsed.hidden).toBe(0);
});
