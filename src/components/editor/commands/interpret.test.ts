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

test('Non-Latin comma-separated values are converted to a table', () => {
    // The character class used to be ASCII-only, so a table in any other script
    // pasted back as plain text rather than as the table it came from.
    const text = '名前,色\nねこ,🐈\nいぬ,🐕';
    expect(interpret(text).startsWith('⎡')).toBe(true);
});

test('false is read as false', () => {
    // It used to be read as `true`, which made a round trip through CSV
    // silently wrong rather than merely broken.
    const text = 'a,b\ntrue,false\nfalse,true';
    const table = interpret(text);
    expect(table).toContain('⊥');
    expect(table).toContain('⊤');
});
