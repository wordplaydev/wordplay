import SeparatedEvaluate from '@conflicts/SeparatedEvaluate';
import UnclosedDelimiter from '@conflicts/UnclosedDelimiter';
import IncompatibleInput from '@conflicts/IncompatibleInput';
import MissingInput from '@conflicts/MissingInput';
import NotInstantiable from '@conflicts/NotInstantiable';
import { testConflict, testTypes } from '@conflicts/TestUtilities';
import UnexpectedInput from '@conflicts/UnexpectedInput';
import UnexpectedTypeInput from '@conflicts/UnexpectedTypeInput';
import UnknownInput from '@conflicts/UnknownInput';
import { UnknownName } from '@conflicts/UnknownName';
import { expect, test } from 'vitest';
import type Conflict from '@conflicts/Conflict';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import evaluateCode from '@runtime/evaluate';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Evaluate from '@nodes/Evaluate';
import MapType from '@nodes/MapType';
import type Node from '@nodes/Node';
import NumberType from '@nodes/NumberType';
import Reference from '@nodes/Reference';
import SetType from '@nodes/SetType';
import Source from '@nodes/Source';

test.each([
    // Calling an undefined function — reported as UnknownName on the Reference,
    // not as a downstream IncompatibleInput on the Evaluate (#1146). nodeIndex
    // 3 picks the fourth Reference in the program (`add`/`sum`): the body
    // `a + b` contains References to `a`, `+` (BinaryEvaluate's operator), and
    // `b` before we reach the call site.
    [
        'add: ƒ(a•# b•#) a + b\nadd(1 2)',
        'add: ƒ(a•# b•#) a + b\nsum(1 2)',
        Reference,
        UnknownName,
        3,
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
        UnknownInput,
    ],
    [
        'x: ƒ(a•# b•#) a - b\nx(1 2)',
        'ƒ x(a•# b•#) a - b\nx(a:1 b:2 c:3)',
        Evaluate,
        UnknownInput,
    ],
    [
        'x: ƒ(a•# b•#) a - b\nx(b:1 a:2)',
        'ƒ x(a•# b•#) a - b\nx(a:1 a:2)',
        Evaluate,
        UnexpectedInput,
    ],
    // Named input with an incompatible value type must produce IncompatibleInput.
    [
        'ƒ x(a•"yes"|"no") a\nx(a:"yes")',
        'ƒ x(a•"yes"|"no") a\nx(a:"maybe")',
        Evaluate,
        IncompatibleInput,
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
    ['x: ƒ(a•#:1 b•#:1) a - b\nx(4 3 2 1)', '1'],
    ['x: ƒ(a•#:1 b…•#:1) [ a b ]\nx(1 5)', '[1 [5]]'],
    ['x: ƒ(a•#:1 b…•#:1) [ a b ]\nx(5 1)', '[5 [1]]'],
])('%s = %s', (code: string, value: string) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

/**
 * The symptom that surfaced the unresolved-output bug, kept in its original shape because the
 * report was so misleading: a one-input predicate was blamed for having one input rather than
 * three. The real mismatch was the predicate's *output* — the call's type was an unresolved
 * name, so the property was unknown and the comparison's type poisoned the lambda — and
 * IncompatibleInput renders a function type as its input count, which named the wrong thing.
 */
test('A predicate that calls a function with a declared structure output is fine', () => {
    // `doors` is bound rather than written inline because a line that opens with `[` continues
    // the line above it as a list access, which would make this fixture about parsing instead.
    const code = `•Door(room•'')
•Room(id•'' needs•'': '')
rooms•[Room]: [ Room('a') Room('b' needs: 'lantern') ]
doors•[Door]: [ Door('b') ]
ƒ go(wanted•'')•Room rooms.find(ƒ(r•Room) r.id = wanted) ?? rooms[1]
doors.filter(ƒ(d•Door) go(d.room).needs = '')`;
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    expect(
        Array.from(project.analyze().conflictedNodes.keys()).map((n) =>
            n.toWordplay(),
        ),
    ).toEqual([]);
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

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([
    ['ƒ f(a•#) a\nf(1)', 'ƒ f(a•#) a\nf(1', Evaluate, UnclosedDelimiter, 0],
    [
        "•T(a•#) ()\nƒ g(x•'' y•'') x\ng('a' 'b')",
        "•T(a•#) ()\nƒ g(x•'' y•'') x\ng(T (1))",
        Evaluate,
        SeparatedEvaluate,
        0,
    ],
])('%s => no conflict, %s => conflict', (good, bad, node, conflict, index) => {
    testConflict(good, bad, node, conflict, index);
});
