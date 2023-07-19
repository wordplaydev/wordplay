import { test } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import { UnexpectedTypeVariable } from '@conflicts/UnexpectedTypeVariable';
import { UnknownName } from '@conflicts/UnknownName';
import Reference from './Reference';

test('Test name conflicts', () => {
    testConflict('a: 1\na', 'b: 1\na', Reference, UnknownName);
    testConflict(
        'ƒ(a•# b•#) a + b',
        'ƒ(a•# b•#) a + c',
        Reference,
        UnknownName,
        2
    );
    testConflict(
        '•Math(a b) (z: a + b)',
        '•Math(a b) (z: a + c)',
        Reference,
        UnknownName,
        2
    );
    testConflict(
        'table: ⎡a•#⎦\ntable ⎡- a = 0',
        'table: ⎡a•#⎦\ntable ⎡- b = 0',
        Reference,
        UnknownName,
        1
    );
    testConflict(
        'ƒ⸨T⸩(a) a + 2',
        'ƒ⸨T⸩() T + 1',
        Reference,
        UnexpectedTypeVariable
    );
});
