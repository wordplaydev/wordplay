import UnknownColumn from '#conflicts/UnknownColumn.ts';
import IncompatibleCellType from '#conflicts/IncompatibleCellType.ts';
import InvalidRow from '#conflicts/InvalidRow.ts';
import MissingCell from '#conflicts/MissingCell.ts';
import { testConflict } from '#conflicts/TestUtilities.ts';
import { expect, test } from 'vitest';
import IncompatibleInput from '#conflicts/IncompatibleInput.ts';
import DefaultLocales from '#locale/DefaultLocales.ts';
import evaluateCode from '#runtime/evaluate.ts';
import Insert from '#nodes/Insert.ts';

test.each([
    [
        'table: ⎡one•#⎦\ntable ⎡+ 1⎦',
        'table: 1\ntable ⎡+ 1⎦',
        Insert,
        IncompatibleInput,
    ],
    [
        'table: ⎡one•#⎦\ntable ⎡+ 1⎦',
        'table: ⎡one•#⎦\ntable ⎡+⎦',
        Insert,
        MissingCell,
    ],
    [
        'table: ⎡one•#⎦\ntable⎡+ 1⎦',
        'table: ⎡one•#⎦\ntable⎡+ "hi"⎦',
        Insert,
        IncompatibleCellType,
    ],
    [
        'table: ⎡one•#⎦\ntable⎡+ 1 1⎦',
        'table: ⎡one•#⎦\ntable⎡+ 1 one:1⎦',
        Insert,
        InvalidRow,
    ],
])('%s => no conflict, %s => conflict', (good, bad, node, conflict) => {
    testConflict(good, bad, node, conflict);
});

test.each([
    ['⎡a•# b•#⎦⎡1 2⎦ ⎡+ 2 3⎦', '⎡ 1 2 ⎦\n⎡ 2 3 ⎦'],
    ['⎡a•# b•#⎦⎡1 2⎦ ⎡+ 2 3⎦ ⎡+ 3 4⎦', '⎡ 1 2 ⎦\n⎡ 2 3 ⎦\n⎡ 3 4 ⎦'],
])('%s = %s', (code: string, value: string) => {
    expect(evaluateCode(code)?.toWordplay(DefaultLocales)).toBe(value);
});

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([
    [
        'table: ⎡one•#⎦\ntable⎡+ one:1⎦',
        'table: ⎡one•#⎦\ntable⎡+ two:1⎦',
        Insert,
        UnknownColumn,
        0,
    ],
])('%s => no conflict, %s => conflict', (good, bad, node, conflict, index) => {
    testConflict(good, bad, node, conflict, index);
});
