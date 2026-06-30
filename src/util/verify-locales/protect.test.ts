import { expect, test } from 'vitest';
import { hasUnclosedText } from './protect';

test('hasUnclosedText flags an identifier that picked up a string delimiter', () => {
    // An apostrophe written as ASCII `'` opens a text literal that never closes.
    expect(hasUnclosedText("o'brien: 5")).toBe(true);
    expect(hasUnclosedText('a: "unclosed')).toBe(true);
});

test('hasUnclosedText accepts balanced literals and interpolations', () => {
    expect(hasUnclosedText('oʼbrien: 5')).toBe(false); // U+02BC is a letter, not a delimiter
    expect(hasUnclosedText('say("hi")')).toBe(false);
    expect(hasUnclosedText('joe,tess,amy: 5')).toBe(false);
    // A `\…\` inside a text literal is an embedded expression, not a close.
    expect(hasUnclosedText('"sums \\1 + 2\\ and \\2 + 3\\"')).toBe(false);
    expect(hasUnclosedText('“”')).toBe(false); // empty literal, matched pair
});
