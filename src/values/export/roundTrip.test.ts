import DefaultLocales from '@locale/DefaultLocales';
import TableLiteral from '@nodes/TableLiteral';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import evaluateCode from '@runtime/evaluate';
import { must } from '@util/nullable';
import { parseCSV } from '@values/export/csv';
import { serialize } from '@values/export/exportValue';
import { expect, test } from 'vitest';

/**
 * The loop the whole feature rests on: a table exported as CSV and pasted back
 * into the editor is the same table.
 *
 * Asserted by exporting the re-imported table again and comparing the text,
 * rather than by comparing values. That is the statement a creator can check —
 * paste it back, export it again, same file — and it does not depend on two
 * separately built `TableType`s comparing equal.
 */
function roundTrip(code: string): [string, string] {
    const before = must(
        serialize(must(evaluateCode(code), 'no value'), 'csv', DefaultLocales),
        'no export',
    ).text;

    const table = must(
        TableLiteral.from(parseCSV(before)),
        'did not re-import',
    );
    const after = must(
        serialize(
            must(
                evaluateCode(table.toWordplay(getPreferredSpaces(table))),
                'no value after re-import',
            ),
            'csv',
            DefaultLocales,
        ),
        'no export after re-import',
    ).text;

    return [before, after];
}

test.each([
    [`⎡name•'' age•#⎦\n⎡'Amy' 9⎦\n⎡'Kim' 10⎦`],
    // Booleans: the case that used to come back all `true`.
    [`⎡a•? b•?⎦\n⎡⊤ ⊥⎦\n⎡⊥ ⊤⎦`],
    // Non-Latin content: the case `isCSV` used to refuse outright.
    [`⎡名前•'' 色•''⎦\n⎡'ねこ' '🐈'⎦\n⎡'いぬ' '🐕'⎦`],
    // A cell holding the delimiter, which is what the quoting is for.
    [`⎡name•'' note•''⎦\n⎡'Amy' 'likes, commas'⎦\n⎡'Kim' 'and "quotes"'⎦`],
])('%s survives a round trip', (code) => {
    const [before, after] = roundTrip(code);
    expect(after).toBe(before);
});

test('a unit is lost on re-import, and the numbers are not', () => {
    // Stated as a test because it is a real limit of the format: the header
    // carries the unit out, and nothing carries it back in.
    const [before, after] = roundTrip(`⎡d•#m⎦\n⎡5m⎦\n⎡7m⎦`);
    expect(before).toBe('d (m)\r\n5\r\n7');
    expect(after).toBe('d\r\n5\r\n7');
});
