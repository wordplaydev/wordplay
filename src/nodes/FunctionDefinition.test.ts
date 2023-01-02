import { test, expect } from 'vitest';
import { testConflict } from '../conflicts/TestUtilities';
import DuplicateLanguages from '../conflicts/DuplicateLanguages';
import RequiredAfterOptional from '../conflicts/RequiredAfterOptional';
import DuplicateTypeVariables from '../conflicts/DuplicateTypeVariables';
import FunctionDefinition from './FunctionDefinition';
import DuplicateNames from '../conflicts/DuplicateNames';
import Names from './Names';
import Docs from './Docs';
import TypeVariables from './TypeVariables';
import Evaluator from '../runtime/Evaluator';
import EvaluationException from '../runtime/EvaluationException';
import NoExpression from '../conflicts/NoExpression';

test.each([
    [
        '`hi`/eng`hola`/spa Cat → "" "meow"',
        '`hi`/eng`hola`/eng Cat → "" "meow"',
        Docs,
        DuplicateLanguages,
    ],
    [
        '`hi`/eng`hola`/spa ƒ() 1',
        '`hi`/eng`hola`/eng ƒ() 1',
        Docs,
        DuplicateLanguages,
    ],
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
        EvaluationException
    );
});
