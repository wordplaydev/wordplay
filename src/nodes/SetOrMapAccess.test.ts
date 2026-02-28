import { IncompatibleKey } from '@conflicts/IncompatibleKey';
import { testConflict } from '@conflicts/TestUtilities';
import { UnknownName } from '@conflicts/UnknownName';
import { expect, test } from 'vitest';
import IncompatibleInput from '../conflicts/IncompatibleInput';
import evaluateCode from '../runtime/evaluate';
import Reference from './Reference';
import SetOrMapAccess from './SetOrMapAccess';

test.each([
    [
        '{1:1 2:2 3:3}{1}',
        '{1:1 2:2 3:3}{"hi"}',
        SetOrMapAccess,
        IncompatibleKey,
        0,
    ],
    ['{1:1 2:2 3:3}{1}', '[1 2 3]{"hi"}', SetOrMapAccess, IncompatibleInput, 0],
    [
        "map: { 1: 1 'hi': 0}\nmap{1}•# ? map{1} + 1 0",
        "map: { 1: 1 'hi': 0}\nmap{1}•'' ? map{1} + 1 0",
        Reference,
        UnknownName,
        2,
    ],
])('%s => no conflict, %s => conflict', (good, bad, node, conflict, index) => {
    testConflict(good, bad, node, conflict, index);
});

test.each([
    ['{1 2 3}{2}', '⊤'],
    ['{1 2 3}{5}', '⊥'],
    ["{1:'a' 2:'b' 3:'c'}{2}", '"b"'],
    ["{1:'a' 2:'b' 3:'c'}{4}", 'ø'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});
