import { test, expect } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import UnusedBind from '@conflicts/UnusedBind';
import IncompatibleType from '@conflicts/IncompatibleType';
import Bind from './Bind';
import { MisplacedShare } from '@conflicts/MisplacedShare';
import { MissingShareLanguages } from '@conflicts/MissingShareLanguages';
import evaluateCode from '../runtime/evaluate';

test.each([
    ['a•#: 1\na', 'a•"": 1\na', Bind, IncompatibleType],
    ['a•#: 1\na', 'a•"cat"|"dot": "mouse"\na', Bind, IncompatibleType],
    ['a•#: 1\na', 'a•1|2: 3\na', Bind, IncompatibleType],
    ['a: 1\na+a', 'a: 1\n1+1', Bind, UnusedBind],
    ['↑ a: 1', 'ƒ() (↑ a: 1)', Bind, MisplacedShare],
    ['↑ a/en: 1', '↑ a: 1', Bind, MissingShareLanguages],
])(
    'Expect %s no conflicts, %s to have conflicts',
    (good, bad, node, conflict, number?) => {
        testConflict(good, bad, node, conflict, number);
    }
);

test.each([['a: 5\na', '5']])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
