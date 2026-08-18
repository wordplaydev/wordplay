import { IncompatibleKey } from '@conflicts/IncompatibleKey';
import { testConflict } from '@conflicts/TestUtilities';
import { UnknownName } from '@conflicts/UnknownName';
import { expect, test } from 'vitest';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import evaluateCode from '@runtime/evaluate';
import Evaluate from '@nodes/Evaluate';
import Reference from '@nodes/Reference';
import SetOrMapAccess from '@nodes/SetOrMapAccess';

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
    // The shape from #1285: a map access checked against ø in a bind, used as
    // the condition. The good program narrows the true branch to '' and the bad
    // one narrows the false branch to ø, so each proves one direction.
    [
        `ƒ f(t•'') t
notemap: {'a': 'do' 'b': 're'}
pressed: 'a'
validNote: notemap{pressed} ≠ ø
validNote ? f(notemap{pressed}) 'x'`,
        `ƒ f(t•'') t
notemap: {'a': 'do' 'b': 're'}
pressed: 'a'
validNote: notemap{pressed} ≠ ø
validNote ? 'x' f(notemap{pressed})`,
        Evaluate,
        IncompatibleInput,
        0,
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
