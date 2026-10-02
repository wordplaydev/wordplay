import ExpectedSelectName from '#conflicts/ExpectedSelectName.ts';
import { testConflict } from '#conflicts/TestUtilities.ts';
import UnknownColumn from '#conflicts/UnknownColumn.ts';
import { expect, test } from 'vitest';
import IncompatibleInput from '#conflicts/IncompatibleInput.ts';
import DefaultLocales from '#locale/DefaultLocales.ts';
import evaluateCode from '#runtime/evaluate.ts';
import Select from '#nodes/Select.ts';

test.each([
    [
        'table: ⎡one•#⎦\ntable ⎡? one⎦ 1 < 2',
        'table: 1\ntable ⎡? one⎦ 1 < 2',
        Select,
        IncompatibleInput,
    ],
    [
        'table: ⎡one•#⎦\ntable ⎡? one⎦ 1 < 2',
        'table: 1\ntable ⎡? one⎦ 1 + 2',
        Select,
        IncompatibleInput,
    ],
    [
        'table: ⎡one•#⎦\ntable ⎡? one⎦ 1 < 2',
        'table: ⎡one•#⎦\ntable ⎡? two⎦ 1 < 2',
        Select,
        UnknownColumn,
    ],
    [
        'table: ⎡one•#⎦\ntable ⎡? one⎦ one < 1',
        'table: ⎡one•#⎦\ntable ⎡? 1⎦ one < 1',
        Select,
        ExpectedSelectName,
    ],
])(
    'Expect %s no conflicts, %s to have some conflicts',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    },
);

test.each([
    ['⎡a•# b•#⎦⎡1 2⎦ ⎡3 4⎦ ⎡? a b ⎦ a < 2', '⎡ 1 2 ⎦'],
    ['⎡a•# b•#⎦⎡1 2⎦ ⎡3 4⎦ ⎡? a ⎦ a < 2', '⎡ 1 ⎦'],
    ['⎡a•# b•#⎦⎡1 2⎦ ⎡3 4⎦ ⎡?⎦ a < 2', '⎡ 1 2 ⎦'],
    ['⎡a•# b•#⎦⎡1 2⎦ ⎡3 4⎦ ⎡? b ⎦ a < 2', '⎡ 2 ⎦'],
    ['⎡a•# b•#⎦⎡1 2⎦ ⎡3 4⎦ ⎡? b a⎦ a < 2', '⎡ 2 1 ⎦'],
])('%s = %s', (code: string, value: string) => {
    expect(evaluateCode(code)?.toWordplay(DefaultLocales)).toBe(value);
});
