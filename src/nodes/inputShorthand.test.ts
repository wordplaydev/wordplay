import Project from '@db/projects/Project';
import OutputExpression from '@edit/output/OutputExpression';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import BooleanLiteral from '@nodes/BooleanLiteral';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import Evaluate from '@nodes/Evaluate';
import getInputShorthand from '@nodes/inputShorthand';
import Reference from '@nodes/Reference';
import Source from '@nodes/Source';
import evaluateCode from '@runtime/evaluate';
import { expect, test } from 'vitest';

/** The evaluate of the named function, and a context for it. `Source.nodes()` is not
 *  outside-in, so an outer call can't be found by taking the first one. */
function evaluateIn(code: string, fun: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    const evaluate = source
        .nodes()
        .find(
            (node) => node instanceof Evaluate && node.fun.toWordplay() === fun,
        );
    if (!(evaluate instanceof Evaluate))
        throw new Error(`no ${fun}(…) in ${code}`);
    return { project, context, evaluate };
}

/** Which bind each given input fills, as `bindName=source`, in the function's declared order. */
function bindings(code: string, fun = 'Phrase'): string[] {
    const { context, evaluate } = evaluateIn(code, fun);
    return (evaluate.getInputMapping(context)?.inputs ?? [])
        .filter(
            (mapping) =>
                mapping.given !== undefined &&
                !(Array.isArray(mapping.given) && mapping.given.length === 0),
        )
        .map(
            (mapping) =>
                `${mapping.expected.getNames()[0]}=${
                    Array.isArray(mapping.given)
                        ? mapping.given.map((g) => g.toWordplay()).join(' ')
                        : mapping.given?.toWordplay()
                }`,
        );
}

/** The shorthand the named bare reference is, if any. */
function shorthandOf(code: string, name: string, fun = 'Phrase') {
    const { context, evaluate } = evaluateIn(code, fun);
    const reference = evaluate.inputs.find(
        (input) => input instanceof Reference && input.getName() === name,
    );
    return reference instanceof Reference
        ? getInputShorthand(reference, context)
        : undefined;
}

test.each([
    // A bare boolean name fills the input of that name, standing in for ⊤...
    ["Phrase('hi' selectable)", 'selectable', 'Phrase', true],
    // ...including one declared as a union with ø, which is how flipx/flipy are typed.
    ['Pose(flipx)', 'flipx', 'Pose', true],
    // A boolean of the same name in scope is passed through rather than implied.
    ["selectable•?: ⊤\nPhrase('hi' selectable)", 'selectable', 'Phrase', false],
    // Creator-defined structures get the same treatment as the basis.
    ['•Room(won•?: ⊥) ()\nRoom(won)', 'won', 'Room', true],
    // An enclosing property access puts the callee's own members in scope, so the name
    // resolves — to the very input it fills, which is no value at all. It still means ⊤.
    ["Phrase('hi' selectable).selectable", 'selectable', 'Phrase', true],
])('%s: `%s` is a shorthand (implicit %s)', (code, name, fun, implicit) => {
    expect(shorthandOf(code, name, fun)?.implicit).toBe(implicit);
});

test.each([
    // A name in scope that isn't a boolean keeps its positional meaning — this is what
    // keeps the rule from changing any program that already parsed.
    ['selectable: 5m\nPhrase("hi" selectable)', 'selectable'],
    // A non-boolean input is never a shorthand, whatever its name.
    ['Phrase("hi" size)', 'size'],
    // A function or structure of the name is not a value to pass through.
    ['selectable: ƒ() 1\nPhrase("hi" selectable)', 'selectable'],
    // An explicit named input for the bind wins over a bare name for it.
    ['Phrase("hi" selectable: ⊥ selectable)', 'selectable'],
])('%s: `%s` is not a shorthand', (code, name) => {
    expect(shorthandOf(code, name)).toBeUndefined();
});

test('a shorthand binds by name, leaving later positional inputs alone', () => {
    // The whole point of removing shorthands from the positional stream: `30m` must still
    // reach `size`, which is the input the bare `selectable` sits in front of.
    expect(bindings("Phrase('hi' selectable 30m)")).toEqual([
        "text='hi'",
        'size=30m',
        'selectable=selectable',
    ]);
});

test('the first bare name wins and a later duplicate stays positional', () => {
    // The second `selectable` is not a shorthand, so it falls through to the next
    // unfilled positional input rather than fighting for the same bind.
    expect(bindings("Phrase('hi' selectable selectable)")).toEqual([
        "text='hi'",
        'size=selectable',
        'selectable=selectable',
    ]);
});

test('a shorthand is not swallowed by a variable length input', () => {
    // A rest input's sweep takes everything remaining, so a shorthand has to be claimed
    // before it runs or it lands in the list instead of in its own bind.
    expect(bindings('f: ƒ(on•?: ⊥ nums…•#) 1\nf(on 1 2 3)', 'f')).toEqual([
        'on=on',
        'nums=1 2 3',
    ]);
});

test.each([
    // The implied value is ⊤...
    ["Phrase('hi' selectable).selectable", '⊤'],
    ['Pose(flipx).flipx', '⊤'],
    // ...while a name in scope passes its own value through, true or false.
    ["selectable•?: ⊥\np: Phrase('hi' selectable)\np.selectable", '⊥'],
    ["selectable•?: ⊤\np: Phrase('hi' selectable)\np.selectable", '⊤'],
    // Untouched forms keep evaluating as they always did.
    ["Phrase('hi').selectable", '⊥'],
    ["Phrase('hi' selectable: ⊥).selectable", '⊥'],
    // A shorthand for a creator's own function, after a positional input.
    ['f: ƒ(a•# on•?: ⊥) on\nf(1 on)', '⊤'],
])('%s evaluates to %s', (code, expected) => {
    expect(evaluateCode(code)?.toString()).toBe(expected);
});

test.each([
    // Setting a value must keep the binding BY NAME. Replacing the reference in place would
    // hand the value to whatever input its position reaches — here, `size`.
    ['⊥', "Phrase('hi' selectable: ⊥)"],
    // Unsetting removes it, so the bind falls back to its own default. This is what the
    // blocks-mode checkbox does when it is unchecked.
    [undefined, "Phrase('hi')"],
])('withBindAs(%s) on a shorthand gives %s', (value, expected) => {
    const { context, evaluate } = evaluateIn(
        "Phrase('hi' selectable)",
        'Phrase',
    );
    const bind = evaluate
        .getFunction(context)
        ?.inputs.find((input) => input.hasName('selectable'));
    expect(bind).toBeDefined();
    if (bind === undefined) return;
    const revised = evaluate.withBindAs(
        bind,
        value === undefined ? undefined : BooleanLiteral.make(false),
        context,
    );
    expect(revised.toWordplay(getPreferredSpaces(revised))).toBe(expected);
});

test('the palette reads a shorthand as ⊤ and edits it by name', () => {
    const { project, evaluate } = evaluateIn(
        "Phrase('hi' selectable)",
        'Phrase',
    );
    const output = new OutputExpression(project, evaluate, DefaultLocales);
    const value = output.getPropertyValue('selectable');
    expect(value?.given).toBe(true);
    expect(value?.value?.toString()).toBe('⊤');
    // Undefined is what keeps an edit on the `withBindAs` path rather than trying to rewrite a
    // node that lives inside the basis definition.
    expect(value?.resolved).toBeUndefined();
});

test('an evaluate whose function is unknown never asks about shorthands', () => {
    // getInputShorthand asks the parent for its function, which asks `fun` for its type.
    // Were `fun` itself treated as a candidate input, that would recurse forever.
    expect(() =>
        shorthandOf('nope(selectable)', 'selectable', 'nope'),
    ).not.toThrow();
    expect(
        shorthandOf('nope(selectable)', 'selectable', 'nope'),
    ).toBeUndefined();
});
