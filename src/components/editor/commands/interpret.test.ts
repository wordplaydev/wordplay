import { expect, test } from 'vitest';
import interpret, { toTable } from './interpret';

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

// The add-source dialog asks for the table itself rather than its text, so it can name
// and borrow it; these hold that seam to the same rules the paste path follows.
test('a CSV becomes a table with its header as columns and its lines as rows', () => {
    const table = toTable('name,age\nkim,12\nlee,13');
    expect(
        table?.type.columns.map((column) => column.names.getNames()[0]),
    ).toEqual(['name', 'age']);
    expect(table?.rows).toHaveLength(2);
    expect(table?.rows[0]?.cells).toHaveLength(2);
});

test('text with no commas is not a table', () => {
    expect(toTable('just some words')).toBeUndefined();
    expect(toTable('one\ntwo\nthree')).toBeUndefined();
});

test('a table in a script other than Latin is a table', () => {
    expect(toTable('名前,色\nねこ,🐈\nいぬ,🐕')?.rows).toHaveLength(2);
});
