import { expect, test } from 'vitest';
import interpret from './interpret';

test('Newline-separated text literals are not converted to a table', () => {
    const text = '"hello"\n"hello"\n"hello"\n"hello"\n"hello"\n"hello"';
    // No commas separating values, so it should be returned unchanged.
    expect(interpret(text)).toBe(text);
});

test('Comma-separated values are converted to a table', () => {
    const text = 'a,b,c\n1,2,3\n4,5,6';
    expect(interpret(text)).not.toBe(text);
    expect(interpret(text).startsWith('⎡')).toBe(true);
});
