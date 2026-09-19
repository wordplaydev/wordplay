import { expect, test } from 'vitest';
import { escapeCSVField, parseCSV, writeCSVRows } from '@values/export/csv';

test.each([
    ['plain', 'plain'],
    ['', ''],
    ['has,comma', '"has,comma"'],
    ['has"quote', '"has""quote"'],
    ['has\nnewline', '"has\nnewline"'],
    ['has\rreturn', '"has\rreturn"'],
    // Not quoted: readability is most of why anyone opens a CSV.
    ['ねこ 🐈', 'ねこ 🐈'],
])('escape %s', (text, expected) => {
    expect(escapeCSVField(text)).toBe(expected);
});

test('rows are joined with CRLF', () => {
    expect(writeCSVRows([['a', 'b'], ['1']])).toBe('a,b\r\n1');
});

/** The invariant the whole feature rests on: anything written here reads back
 *  as the same cells. */
test.each([
    [
        [
            ['a', 'b'],
            ['1', '2'],
        ],
    ],
    [[['name'], ['O"Brien']]],
    [
        [
            ['name', 'note'],
            ['Amy', 'likes, commas'],
        ],
    ],
    [
        [
            ['name', 'note'],
            ['Amy', 'two\nlines'],
        ],
    ],
    [
        [
            ['名前', '色'],
            ['ねこ', '🐈'],
        ],
    ],
    // Empty cells matter: an `ø` exports as one.
    [
        [
            ['a', 'b'],
            ['', 'x'],
        ],
    ],
    [
        [
            ['a', 'b'],
            ['x', ''],
        ],
    ],
])('round trips %j', (rows) => {
    expect(parseCSV(writeCSVRows(rows))).toEqual(rows);
});

/** A row of nothing but empty cells at the end of a file is indistinguishable
 *  from the newline that conventionally ends one, and the reader resolves that
 *  the way every CSV reader does. Recorded so nobody "fixes" it into a phantom
 *  trailing row on every file we write. */
test('a trailing empty row is not recovered', () => {
    expect(parseCSV(writeCSVRows([['a'], ['']]))).toEqual([['a']]);
});
