import IncompatibleInput from '@conflicts/IncompatibleInput';
import IncompatibleType from '@conflicts/IncompatibleType';
import { MisplacedShare } from '@conflicts/MisplacedShare';
import { MissingShareLanguages } from '@conflicts/MissingShareLanguages';
import { testConflict } from '@conflicts/TestUtilities';
import UnusedBind from '@conflicts/UnusedBind';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Bind from '@nodes/Bind';
import FunctionDefinition from '@nodes/FunctionDefinition';
import NumberType from '@nodes/NumberType';
import Reference from '@nodes/Reference';
import Source from '@nodes/Source';
import evaluateCode from '@runtime/evaluate';
import { expect, test } from 'vitest';

test.each([
    ['a•#: 1\na', 'a•"": 1\na', Bind, IncompatibleType],
    ['a•#: 1\na', 'a•"cat"|"dot": "mouse"\na', Bind, IncompatibleType],
    ['a•#: 1\na', 'a•1|2: 3\na', Bind, IncompatibleType],
    ['a: 1\na+a', 'a: 1\n1+1', Bind, UnusedBind],
    ['↑ a: 1', 'ƒ() (↑ a: 1)', Bind, MisplacedShare],
    ['↑ a/en: 1', '↑ a: 1', Bind, MissingShareLanguages],
])(
    'Expect %s no conflicts, %s to have conflicts',
    (good, bad, node, conflict, number?) => {
        testConflict(good, bad, node, conflict, number);
    },
);

test.each([['a: 5\na', '5']])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

// Regression test (#680): inferring an anonymous-function input's type from a HOF call
// (e.g. `a` in `[1 2 3 4].translate(ƒ(a) a + 1)`) used to trigger a cycle. Bind.getExpectedType
// concretized the *entire* expected function type — including its output type variable, which
// is itself inferred from the user fn's body — recursing back into the bind being computed and
// returning ⁇. Now it only concretizes the specific input bind's type.
test('Anonymous fn input in a HOF call infers its type without a cycle (#680)', () => {
    const source = new Source('test', '[1 2 3 4].translate(ƒ(a) a + 1)');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);

    // No IncompatibleInput conflicts anywhere — the user function should accept.
    const conflicts = project.analyze().conflicts;
    expect(conflicts.filter((c) => c instanceof IncompatibleInput)).toEqual(
        [],
    );

    // The anonymous fn's `a` bind should be inferred as #.
    const userFn = source.expression
        .nodes()
        .find(
            (n): n is FunctionDefinition =>
                n instanceof FunctionDefinition && n.expression !== undefined,
        );
    if (userFn === undefined) throw new Error('expected to find anon fn');
    const aBind = userFn.inputs[0];
    expect(aBind).toBeInstanceOf(Bind);
    expect(aBind.getType(context)).toBeInstanceOf(NumberType);

    // The `a` reference inside the body should also resolve to #.
    const aRef = source.expression
        .nodes()
        .find(
            (n): n is Reference =>
                n instanceof Reference && n.getName() === 'a',
        );
    if (aRef === undefined) throw new Error('expected to find a reference');
    expect(aRef.getType(context)).toBeInstanceOf(NumberType);
});
