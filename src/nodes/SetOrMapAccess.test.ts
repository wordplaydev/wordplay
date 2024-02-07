import { test, expect } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import { IncompatibleKey } from '@conflicts/IncompatibleKey';
import SetOrMapAccess from './SetOrMapAccess';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import evaluateCode from '../runtime/evaluate';
import BinaryEvaluate from './BinaryEvaluate';

test.each([
    [
        '{1:1 2:2 3:3}{1}',
        '{1:1 2:2 3:3}{"hi"}',
        SetOrMapAccess,
        IncompatibleKey,
    ],
    ['{1:1 2:2 3:3}{1}', '[1 2 3]{"hi"}', SetOrMapAccess, IncompatibleInput],
    [
        "map: { 1: 1 'hi': 0}\nmap{1}•# ? map{1} + 1 0",
        "map: { 1: 1 'hi': 0}\nmap{1}•'' ? map{1} + 1 0",
        BinaryEvaluate,
        IncompatibleInput,
    ],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    },
);

test.each([
    ['{1 2 3}{2}', '⊤'],
    ['{1 2 3}{5}', '⊥'],
    ["{1:'a' 2:'b' 3:'c'}{2}", '"b"'],
    ["{1:'a' 2:'b' 3:'c'}{4}", 'ø'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
