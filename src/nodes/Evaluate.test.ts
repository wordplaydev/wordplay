import { test, expect } from 'vitest';
import { testConflict, testTypes } from '@conflicts/TestUtilities';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import NotInstantiable from '@conflicts/NotInstantiable';
import Evaluate from './Evaluate';
import MissingInput from '@conflicts/MissingInput';
import MisplacedInput from '@conflicts/MisplacedInput';
import NumberType from './NumberType';
import SetType from './SetType';
import MapType from './MapType';
import UnknownInput from '@conflicts/UnknownInput';
import UnexpectedTypeInput from '@conflicts/UnexpectedTypeInput';
import type Node from './Node';
import type Conflict from '../conflicts/Conflict';
import evaluateCode from '../runtime/evaluate';
import BinaryEvaluate from './BinaryEvaluate';

test.each([
    [
        'add: ƒ(a•# b•#) a + b\nadd(1 2)',
        'add: ƒ(a•# b•#) a + b\nsum(1 2)',
        Evaluate,
        IncompatibleInput,
    ],
    [
        '•Cat() (add: ƒ(a•# b•#) a)\nCat()',
        '•Cat() (add: ƒ(a•# b•#) _)\nCat()',
        Evaluate,
        NotInstantiable,
    ],
    [
        '•Cat(a•#) ()\nCat(1)',
        '•Cat(a•#) ()\nCat("hi")',
        Evaluate,
        IncompatibleInput,
    ],
    [
        'x: ƒ(a•# b•#) a - b\nx(1 2)',
        'ƒ x(a•# b•#) a - b\nx(1)',
        Evaluate,
        MissingInput,
    ],
    [
        'x: ƒ(a•# b•#) a - b\nx(1 2)',
        'ƒ x(a•# b•#) a - b\nx(a:1 c:2)',
        Evaluate,
        MisplacedInput,
    ],
    [
        'x: ƒ(a•# b•#) a - b\nx(1 2)',
        'ƒ x(a•# b•#) a - b\nx(a:1 b:2 c:3)',
        Evaluate,
        UnknownInput,
    ],
    [
        'x: ƒ(a•# b•#) a - b\nx(1 2)',
        'ƒ x(a•# b•#) a - b\nx(a:1 a:2)',
        Evaluate,
        MisplacedInput,
    ],
    [
        'x: ƒ(num…•#) a - b\nx(1 2 3)',
        'x: ƒ(num…•"") num[1]  b\nx(1 2 3)',
        Evaluate,
        IncompatibleInput,
    ],
    ['(ƒ() 5)()', '(ƒ() 5 5)()', Evaluate, IncompatibleInput],
    // Type inputs have to be declared
    [
        '•Cat⸨Desire⸩()\nCat⸨#⸩()',
        '•Cat()\nCat⸨#⸩()',
        Evaluate,
        UnexpectedTypeInput,
    ],
    // A function has to exist on all possible types of an expression
    [
        `
        a: [ 1 1 ].random()
        a.cos()
        `,
        `
        a: [ 1 "2" ].random()
        a.cos()
        `,
        Evaluate,
        IncompatibleInput,
        1,
    ],
    // Infer bind types from function inputs
    [
        `
        ƒ x(a•ƒ(num•'') '') a('')
        x(ƒ(c•'') c)
        `,
        `
        ƒ x(a•ƒ(num•#) #) a(1)
        x(ƒ(c•'') 1)
        `,
        Evaluate,
        IncompatibleInput,
        1,
    ],
    // Infer structure input types from evaluate inputs
    [
        `•Struct(c)
        a: Struct(2)
        a.c + 1`,
        `•Struct(c)
        a: Struct(2)
        a.c + 'hi'`,
        BinaryEvaluate,
        IncompatibleInput,
    ],
])(
    '%s => none, %s => conflict',
    (
        good: string,
        bad: string,
        node: new (...params: never[]) => Node,
        conflict: new (...params: never[]) => Conflict,
        number?: number,
    ) => {
        testConflict(good, bad, node, conflict, number);
    },
);

test.each([
    ['x: ƒ(a•# b•#) a - b\nx(10 3)', '7'],
    ['x: ƒ(a•# b•#) a - b\nx(a:10 b:3)', '7'],
    ['x: ƒ(a•# b•#:1) a - b\nx(5)', '4'],
    ['x: ƒ(a•#:1 b•#:1) a - b\nx()', '0'],
    ['x: ƒ(a•#:1 b•#:1) a - b\nx(5)', '4'],
    ['x: ƒ(a•#:1 b•#:1) a - b\nx(a:4 b:2)', '2'],
    ['x: ƒ(a•#:1 b•#:1) a - b\nx(b:1 a:5)', '4'],
    ['x: ƒ(a•#:1 b…•#:1) [ a b ]\nx(1 5)', '[1 [5]]'],
    ['x: ƒ(a•#:1 b…•#:1) [ a b ]\nx(5 1)', '[5 [1]]'],
    ['x: ƒ(a•# b•#) a - b\nx(10 3)', '7'],
    ['x: ƒ(a•# b•#) a - b\nx(a:10 b:3)', '7'],
    ['x: ƒ(a•# b•#:1) a - b\nx(5)', '4'],
    ['x: ƒ(a•#:1 b•#:1) a - b\nx()', '0'],
    ['x: ƒ(a•#:1 b•#:1) a - b\nx(5)', '4'],
    ['x: ƒ(a•#:1 b•#:1) a - b\nx(a:4 b:2)', '2'],
    ['x: ƒ(a•#:1 b•#:1) a - b\nx(b:1 a:5)', '4'],
    ['x: ƒ(a•#:1 b…•#:1) [ a b ]\nx(1 5)', '[1 [5]]'],
    ['x: ƒ(a•#:1 b…•#:1) [ a b ]\nx(5 1)', '[5 [1]]'],
])('%s = %s', (code: string, value: string) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

test('Test generics', () => {
    // Get the type from the evaluation's type input.
    testTypes('ƒ test⸨T⸩(a•T) a\ntest⸨#⸩(1)', NumberType);
    // Make sure it works for multiple inputs.
    testTypes("ƒ test⸨T U V⸩(a•V) a\ntest⸨# '' #⸩(1)", NumberType);
    // Infer the type from an input.
    testTypes('ƒ test⸨T⸩(a•T) a\ntest(1)', NumberType);
    // Infer from lists
    testTypes('[ 1 2 3 ].random()', NumberType);
    // Infer from sets
    testTypes('{ 1 2 3 }.remove(1)', SetType);
    // Infer from map higher order function
    testTypes('{ 1:2 2:3 3:4 }.remove(1)', MapType);

    testTypes(
        `
        •Cat⸨Kind⸩(a•Kind)
        Cat⸨""⸩("hi").a.length()
    `,
        NumberType,
    );

    // Infer from map keys
    // testTypes("{ 1:'a' 2:'b' 3:'c' }→{}", SetType);
    // testTypes("{ 1:'a' 2:'b' 3:'c' }→{}→[]", ListType);
    // testTypes("{ 1:'a' 2:'b' 3:'c' }→{}→[][1]", NumberType);
    // Infer from map values
    // testTypes("{ 1:'a' 2:'b' 3:'c' }→[][1]", TextType);
});
