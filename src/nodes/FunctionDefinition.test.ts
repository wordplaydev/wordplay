import { test, expect } from 'vitest';
import { testConflict } from '../conflicts/TestUtilities';
import RequiredAfterOptional from '../conflicts/RequiredAfterOptional';
import DuplicateTypeVariables from '../conflicts/DuplicateTypeVariables';
import FunctionDefinition from './FunctionDefinition';
import DuplicateNames from '../conflicts/DuplicateNames';
import Names from './Names';
import TypeVariables from './TypeVariables';
import Evaluator from '../runtime/Evaluator';
import NoExpression from '../conflicts/NoExpression';
import EvaluationLimitException from '../runtime/EvaluationLimitException';

test.each([
    ['ƒ x,y,z(a b) 1', 'ƒ x,x,x(a b) 1', Names, DuplicateNames],
    ['ƒ(a b) 1', 'ƒ(a a) 1', FunctionDefinition, DuplicateNames],
    ['ƒ⸨T U⸩() 1', 'ƒ⸨T T⸩() 1', TypeVariables, DuplicateTypeVariables],
    ['ƒ(a b:1)', 'ƒ(a:1 b)', FunctionDefinition, RequiredAfterOptional],
    ['ƒ(a b:1)', 'ƒ(a:1 b)', FunctionDefinition, RequiredAfterOptional],
    ['ƒ a() 1', 'ƒ a()', FunctionDefinition, NoExpression],
])(
    'Expect %s no conflicts, %s to have %s with %s',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);

test('Test text functions', () => {
    expect(Evaluator.evaluateCode('ƒ a() a() a()')).toBeInstanceOf(
        EvaluationLimitException
    );
});
