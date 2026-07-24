import IncompatibleInput from '@conflicts/IncompatibleInput';
import IncompatibleType from '@conflicts/IncompatibleType';
import { MisplacedShare } from '@conflicts/MisplacedShare';
import { MissingShareLanguages } from '@conflicts/MissingShareLanguages';
import { testConflict } from '@conflicts/TestUtilities';
import UnusedBind from '@conflicts/UnusedBind';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Bind from '@nodes/Bind';
import Changed from '@nodes/Changed';
import FunctionDefinition from '@nodes/FunctionDefinition';
import NumberType from '@nodes/NumberType';
import Previous from '@nodes/Previous';
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

// Regression tests (#1232): a bind annotated with a stream's *value* type is still a stream
// reference. Stream-ness is tracked by Type node identity in Context.streamTypes, and an
// annotation is a different node than the stream definition's output type, so Bind.computeType
// has to carry the registration over to the type it returns.
test.each([
    [
        'clk•#ms: Time(100ms)\n1 … ∆ clk … 2',
        'clk•#ms: 1ms\n1 … ∆ clk … 2',
        Changed,
        IncompatibleInput,
    ],
    [
        'clk•#ms: Time(100ms)\n← 1 clk',
        'clk•#ms: 1ms\n← 1 clk',
        Previous,
        IncompatibleInput,
    ],
])(
    'Expect %s no conflicts, %s to have conflicts',
    (good, bad, node, conflict) => {
        testConflict(good, bad, node, conflict);
    },
);

// The annotation is concretized when it contains a name (`[Thing]` resolves to the Thing
// structure), producing a fresh type node; the stream registration has to land on that final
// node, not the pre-concretized one.
test('∆ accepts a stream bind annotated with a concretized value type (#1232)', () => {
    const source = new Source(
        'test',
        'sightings•[Thing]: Objects(count: 10 confidence: 0.5)\n1 … ∆ sightings … 2',
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const changed = source.expression
        .nodes()
        .find((n): n is Changed => n instanceof Changed);
    if (changed === undefined) throw new Error('expected to find a ∆');
    expect(changed.getConflicts(project.getContext(source))).toEqual([]);
});

// #1237: the explicit stream type `•…T` makes a value keep its stream identity across a
// function boundary, so a stream can be passed into a function and observed with ∆/←/reaction.
// A plain value-type param (`t•#ms`) still can't — a parameter has no value to register.
test.each([
    // A `•…T` param used by ∆ / ← / a reaction condition — passed a real stream — is clean.
    'ƒ f(t•…#ms) 0 … ∆ t … ⬚ + 1\nf(Time(100ms))',
    'ƒ g(s•…#ms) ← 1 s\ng(Time(100ms))',
    // A `•…T` value auto-dereferences, so value-use (operator, arithmetic, method, ←← history)
    // is conflict-free and typed as the value type.
    'ƒ demo(t•…#ms) [(t > 1ms) (t + 1ms) (t ÷ 1ms).round() (←← 3 t)]\ndemo(Time(100ms))',
])('no conflicts: %s', (code) => {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    expect(project.analyze().conflicts).toEqual([]);
});

test.each([
    // Passing a non-stream value to a `•…T` parameter is an IncompatibleInput at the call site
    // (pointing at the bad argument, not at ∆).
    'ƒ f(t•…#ms) 0 … ∆ t … ⬚ + 1\nf(1ms)',
    // A plain value-type param is NOT a stream, so ∆ on it conflicts even when passed a stream —
    // the parameter must be declared `•…T` to observe changes.
    'ƒ f(t•#ms) ∆ t\nf(Time(100ms))',
])('has an IncompatibleInput conflict: %s', (code) => {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    expect(
        project.analyze().conflicts.some((c) => c instanceof IncompatibleInput),
    ).toBe(true);
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
    expect(conflicts.filter((c) => c instanceof IncompatibleInput)).toEqual([]);

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
