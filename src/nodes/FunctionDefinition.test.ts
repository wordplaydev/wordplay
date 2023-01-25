import { test, expect } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import RequiredAfterOptional from '@conflicts/RequiredAfterOptional';
import DuplicateTypeVariable from '@conflicts/DuplicateTypeVariable';
import FunctionDefinition from './FunctionDefinition';
import DuplicateName from '@conflicts/DuplicateName';
import TypeVariables from './TypeVariables';
import Evaluator from '@runtime/Evaluator';
import NoExpression from '@conflicts/NoExpression';
import EvaluationLimitException from '@runtime/EvaluationLimitException';

test.each([
    ['ƒ(a b) 1', 'ƒ(a a) 1', FunctionDefinition, DuplicateName],
    ['ƒ⸨T U⸩() 1', 'ƒ⸨T T⸩() 1', TypeVariables, DuplicateTypeVariable],
    ['ƒ(a b:1)', 'ƒ(a:1 b)', FunctionDefinition, RequiredAfterOptional],
    ['ƒ(a b:1)', 'ƒ(a:1 b)', FunctionDefinition, RequiredAfterOptional],
    ['ƒ a() 1', 'ƒ a()', FunctionDefinition, NoExpression],
])(
    'Expect %s no conflicts, %s to have conflicts',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);

test('Test text functions', () => {
    expect(Evaluator.evaluateCode('ƒ a() a() a()')).toBeInstanceOf(
        EvaluationLimitException
    );
});
