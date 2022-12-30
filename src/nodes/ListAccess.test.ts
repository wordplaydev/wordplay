import { test, expect } from 'vitest';
import { testConflict } from '../conflicts/TestUtilities';
import { NotAListIndex } from '../conflicts/NotAListIndex';
import Evaluator from '../runtime/Evaluator';
import ListAccess from './ListAccess';
import { NotAList } from '../conflicts/NotAList';

test('Test list access conflicts', () => {
    testConflict('[1 2 3][0]', '[1 2 "hi"]["hi"]', ListAccess, NotAListIndex);
    testConflict('[1][1]', '1[1]', ListAccess, NotAList);
});

test('Test list access evaluation', () => {
    expect(Evaluator.evaluateCode('[1 2 3][2]')?.toString()).toBe('2');
    expect(Evaluator.evaluateCode('[1 2 3][0]')?.toString()).toBe('ø');
    expect(Evaluator.evaluateCode('[1 2 3][-1]')?.toString()).toBe('3');
    expect(Evaluator.evaluateCode('[1 2 3][-3]')?.toString()).toBe('1');
    expect(Evaluator.evaluateCode('[1 2 3][-4]')?.toString()).toBe('ø');
});
