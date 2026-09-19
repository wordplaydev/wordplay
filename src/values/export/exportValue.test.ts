import DefaultLocales from '@locale/DefaultLocales';
import evaluateCode from '@runtime/evaluate';
import { must } from '@util/nullable';
import {
    bytesOf,
    canExport,
    formatsFor,
    serialize,
    type ExportFormat,
} from '@values/export/exportValue';
import { expect, test } from 'vitest';

function value(code: string) {
    return must(evaluateCode(code), `${code} produced no value`);
}

function text(code: string, format: ExportFormat) {
    return must(
        serialize(value(code), format, DefaultLocales),
        `${code} did not serialize as ${format}`,
    ).text;
}

const Table = `⎡name•'' age•#⎦\n⎡'Amy' 9⎦\n⎡'Kim' 10⎦`;
const Cat = `•Cat(name•'' age•#)`;

test.each([
    // Worth a file.
    [Table, true],
    [`[1 2 3]`, true],
    [`{'a' 'b'}`, true],
    [`{'a':1 'b':2}`, true],
    [`${Cat}\nCat('Zia' 3)`, true],
    // Not worth one: a scalar alone is nothing anyone wants a file of, and it
    // is what keeps the menu item off every number literal.
    [`1`, false],
    [`'hello'`, false],
    [`⊤`, false],
    [`ø`, false],
    // Not data at all.
    [`ƒ() 1`, false],
    // Nothing to put in it.
    [`[]`, false],
])('canExport %s is %s', (code, expected) => {
    expect(canExport(value(code))).toBe(expected);
});

test('a table exports as both', () => {
    expect(formatsFor(value(Table), DefaultLocales)).toEqual(['csv', 'json']);
});

test('a table is a header and its rows', () => {
    expect(text(Table, 'csv')).toBe('name,age\r\nAmy,9\r\nKim,10');
});

test('a list of records is a header and its rows', () => {
    expect(text(`${Cat}\n[Cat('Zia' 3) Cat('Moe' 5)]`, 'csv')).toBe(
        'name,age\r\nZia,3\r\nMoe,5',
    );
});

test('a shared unit rides in the header, leaving a number a spreadsheet can add', () => {
    expect(text(`⎡d•#m⎦\n⎡5m⎦\n⎡7m⎦`, 'csv')).toBe('d (m)\r\n5\r\n7');
});

test('a mixed-unit column keeps its units in the cells', () => {
    expect(text(`⎡d•#m|#s⎦\n⎡5m⎦\n⎡7s⎦`, 'csv')).toBe('d\r\n5m\r\n7s');
});

test('booleans are the words a spreadsheet and a re-import both read', () => {
    expect(text(`⎡a•?⎦\n⎡⊤⎦\n⎡⊥⎦`, 'csv')).toBe('a\r\ntrue\r\nfalse');
});

test('none is an empty cell', () => {
    expect(text(`⎡a•''|ø⎦\n⎡ø⎦`, 'csv')).toBe('a\r\n');
});

test('a number keeps its exact decimal rather than a float', () => {
    expect(text(`[0.30000000000000004]`, 'json')).toContain(
        '0.30000000000000004',
    );
});

test('a structure is an object keyed by its field names', () => {
    expect(text(`${Cat}\nCat('Zia' 3)`, 'json')).toBe(
        '{\n  "name": "Zia",\n  "age": 3\n}',
    );
});

test('a map of text keys is an object', () => {
    expect(text(`{'a':1 'b':2}`, 'json')).toBe('{\n  "a": 1,\n  "b": 2\n}');
});

test('a list of lists has no header to write, so only JSON is offered', () => {
    const list = value(`[[1 2] [3 4]]`);
    expect(canExport(list)).toBe(true);
    expect(formatsFor(list, DefaultLocales)).toEqual(['json']);
});

test('a value holding a function is not data, however it looks from outside', () => {
    // The cheap screen says yes — the first item is a number — and only the walk
    // disagrees. That disagreement is the design: it is what keeps the walk off
    // every frame that renders a long list.
    const list = value(`[1 ƒ() 1]`);
    expect(canExport(list)).toBe(true);
    expect(formatsFor(list, DefaultLocales)).toEqual([]);
});

test('a CSV download carries a byte order mark and a copy does not', () => {
    const exported = must(
        serialize(value(Table), 'csv', DefaultLocales),
        'no export',
    );
    expect(bytesOf(exported)[0]).toBe(0xef);
    expect(exported.text.startsWith('﻿')).toBe(false);
});

test('JSON reports what it had to drop', () => {
    const exported = must(
        serialize(value(`[1m 2m]`), 'json', DefaultLocales),
        'no export',
    );
    expect(exported.notes?.droppedUnits).toBe(true);
});
