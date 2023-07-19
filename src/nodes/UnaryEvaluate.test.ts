import { test } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import UnaryEvaluate from './UnaryEvaluate';
import IncompatibleInput from '../conflicts/IncompatibleInput';

test.each([
    ['~(1 > 1)', '~"hi"', UnaryEvaluate, IncompatibleInput],
    ['-(1)', '-"hi"', UnaryEvaluate, IncompatibleInput],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);
