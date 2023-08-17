import { test, expect } from 'vitest';
import { testConflict } from '@conflicts/TestUtilities';
import RequiredAfterOptional from '@conflicts/RequiredAfterOptional';
import DuplicateTypeVariable from '@conflicts/DuplicateTypeVariable';
import FunctionDefinition from './FunctionDefinition';
import DuplicateName from '@conflicts/DuplicateName';
import TypeVariables from './TypeVariables';
import NoExpression from '@conflicts/NoExpression';
import EvaluationLimitException from '@values/EvaluationLimitException';
import IncompatibleType from '../conflicts/IncompatibleType';
import evaluateCode from '../runtime/evaluate';

test.each([
    ['ƒ(a b) 1', 'ƒ(a a) 1', FunctionDefinition, DuplicateName],
    ['ƒ⸨T U⸩() 1', 'ƒ⸨T T⸩() 1', TypeVariables, DuplicateTypeVariable],
    ['ƒ(a b:1)', 'ƒ(a:1 b)', FunctionDefinition, RequiredAfterOptional],
    ['ƒ(a b:1)', 'ƒ(a:1 b)', FunctionDefinition, RequiredAfterOptional],
    ['ƒ a() 1', 'ƒ a()', FunctionDefinition, NoExpression],
    ['ƒ a()•# 1', 'ƒ a()•? 1', FunctionDefinition, IncompatibleType],
])(
    'Expect %s no conflicts, %s to have conflicts',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    }
);

test('Test text functions', () => {
    expect(evaluateCode('ƒ a() a() a()')).toBeInstanceOf(
        EvaluationLimitException
    );
});
