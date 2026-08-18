import DuplicateName from '@conflicts/DuplicateName';
import DuplicateTypeVariable from '@conflicts/DuplicateTypeVariable';
import NoExpression from '@conflicts/NoExpression';
import RequiredAfterOptional from '@conflicts/RequiredAfterOptional';
import { testConflict, testTypes } from '@conflicts/TestUtilities';
import EvaluationLimitException from '@values/EvaluationLimitException';
import { expect, test } from 'vitest';
import IncompatibleType from '@conflicts/IncompatibleType';
import evaluateCode from '@runtime/evaluate';
import BooleanType from '@nodes/BooleanType';
import FunctionDefinition from '@nodes/FunctionDefinition';
import NumberType from '@nodes/NumberType';
import TextType from '@nodes/TextType';
import TypeVariables from '@nodes/TypeVariables';

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
    },
);

test('Test evaluation limit', () => {
    expect(evaluateCode('ƒ a() a() a()')).toBeInstanceOf(
        EvaluationLimitException,
    );
});

/**
 * A declared output type is an annotation, so a name in it is just a name until something
 * resolves it. It used to reach callers unresolved, which meant a call's type was a NameType
 * that member resolution could find nothing on: `go().n` was unknown and `go() = go()` couldn't
 * find `=`. Binding the result first hid this, because Bind resolves its annotation.
 */
const structure = "•R(n•'')\nƒ go()•R R('x')\n";

test('A declared structure output type resolves to the structure', () => {
    testTypes(`${structure}go().n`, TextType);
    testTypes(`${structure}go() = go()`, BooleanType);
    // A structure's type inputs survive the resolution.
    testTypes('•C⸨K⸩(v•K)\nƒ mk(x•#)•C⸨#⸩ C⸨#⸩(x)\nmk(1).v', NumberType);
    // A stream's declared output is the same annotation in a different place: `Now()` names
    // `Moment`, so `Now().year` was unknown too — and silently, with no conflict of its own.
    testTypes('(Now().year ?? 0) + 1', NumberType);
});

test('A declared output that is a type variable stays a type variable', () => {
    testTypes('ƒ id⸨T⸩(x•T)•T x\nid(1)', NumberType);
    testTypes("ƒ id⸨T⸩(x•T)•T x\nid('hi')", TextType);
});
