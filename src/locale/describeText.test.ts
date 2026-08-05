import countWords from '@locale/countWords';
import previewText, { PreviewLength } from '@locale/previewText';
import { expect, test } from 'vitest';

test('words are counted, not whitespace runs', () => {
    expect(countWords('Hello there, friend!', 'en')).toBe(3);
    // The reason this uses Intl.Segmenter: Chinese has no spaces, so splitting
    // on whitespace would count this whole phrase as one word.
    expect(countWords('我喜欢编程', 'zh')).toBeGreaterThan(1);
});

test('an empty doc has no words', () => {
    expect(countWords('', 'en')).toBe(0);
});

test('a malformed locale tag falls back rather than throwing', () => {
    expect(countWords('Hello there', 'en_es')).toBe(2);
});

test('short text is spoken whole, long text is elided', () => {
    expect(previewText('  Hello there  ')).toBe('Hello there');
    const long = 'a'.repeat(PreviewLength + 10);
    expect(previewText(long)).toBe(`${'a'.repeat(PreviewLength)}…`);
});
