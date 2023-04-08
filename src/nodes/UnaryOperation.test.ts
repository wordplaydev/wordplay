import { test } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import UnaryOperation from './UnaryOperation';
import NotAFunction from '@conflicts/NotAFunction';

test.each([
    ['~(1 > 1)', '~"hi"', UnaryOperation, NotAFunction],
    ['-(1)', '-"hi"', UnaryOperation, NotAFunction],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);
