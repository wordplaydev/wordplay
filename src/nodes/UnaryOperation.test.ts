import { test } from 'vitest';
import { testConflict } from '../conflicts/TestUtilities';
import UnaryOperation from './UnaryOperation';
import NotAFunction from '../conflicts/NotAFunction';

test('Test unary conflicts', () => {
    testConflict('~(1 > 1)', '~"hi"', UnaryOperation, NotAFunction);
    testConflict('-1', '-"hi"', UnaryOperation, NotAFunction);
});
