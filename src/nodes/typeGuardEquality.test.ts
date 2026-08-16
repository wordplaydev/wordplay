import IncompatibleInput from '@conflicts/IncompatibleInput';
import { conflictsIn, testConflict } from '@conflicts/TestUtilities';
import { expect, test } from 'vitest';
import type Conflict from '@conflicts/Conflict';
import Conditional from '@nodes/Conditional';
import Evaluate from '@nodes/Evaluate';
import type Node from '@nodes/Node';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';

/** The types of a conditional's two branches, as written. */
function branchTypes(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    const conditional = source.expression
        .nodes()
        .find((n) => n instanceof Conditional);
    return [
        conditional?.yes.getType(context).toWordplay(),
        conditional?.no.getType(context).toWordplay(),
    ];
}

const union = `a•'x'|'equis'|'z': 'x'\n`;

/**
 * A text literal with several translations evaluates to one of them — the reader's — and
 * which one isn't knowable while type checking. The true branch alone would be sound
 * ("a is one of the translations"), but a conditional reads its false branch as the
 * complement of its true one, and the complement of a maybe is not a fact: under a
 * Spanish locale the literal is 'equis', so the comparison being false says nothing
 * about 'x'. It used to subtract both.
 */
test('a comparison against a multi-translation literal narrows nothing', () => {
    expect(branchTypes(union + `(a = 'x'/en,'equis'/es) ? a a`)).toEqual([
        `'x'|'equis'|'z'`,
        `'x'|'equis'|'z'`,
    ]);
    expect(branchTypes(union + `(a ≠ 'x'/en,'equis'/es) ? a a`)).toEqual([
        `'x'|'equis'|'z'`,
        `'x'|'equis'|'z'`,
    ]);
});

test('a comparison against one translation still narrows both branches', () => {
    expect(branchTypes(union + `(a = 'x'/en) ? a a`)).toEqual([
        `'x'`,
        `'equis'|'z'`,
    ]);
    expect(branchTypes(union + `(a = 'x') ? a a`)).toEqual([
        `'x'`,
        `'equis'|'z'`,
    ]);
});

/**
 * Narrowing against a literal used to intersect a union's *general* member away to
 * nothing, which becomes NeverType at the use site — so a correct program was reported
 * as broken. Falling back to the general type keeps it honest.
 */
test('comparing a general union member to a literal keeps the general type', () => {
    expect(branchTypes(`a•#|'': 1\n(a = 'hi') ? a a`)).toEqual([`''`, `#`]);
    expect(conflictsIn(`a•#|'': 1\n(a = 'hi') ? a.length() 0`)).toEqual([]);
});

test.each([
    // A literal given a name narrows like the literal written inline, the same way a
    // check given a name guards like the check written inline (#1285).
    [
        `a•'x'|'z': 'x'
k: 'x'
ƒ f(t•'x') t
(a = k) ? f(a) 'q'`,
        `a•'x'|'z': 'x'
k: 'x'
ƒ f(t•'x') t
(a = k) ? 'q' f(a)`,
        Evaluate,
        IncompatibleInput,
        0,
    ],
])('%s => no conflict, %s => conflict', (good, bad, node, conflict, index) => {
    testConflict(
        good,
        bad,
        node as new (...params: never[]) => Node,
        conflict as new (...params: never[]) => Conflict,
        index as number,
    );
});

/**
 * An input's value is a default a caller may override, so it isn't what the name holds
 * at the comparison — following it would narrow on a value that never arrives.
 */
test('a function input default does not narrow', () => {
    expect(
        branchTypes(`ƒ f(a•'x'|'z' k•'': 'x') ((a = k) ? a a)\nf('z' 'z')`),
    ).toEqual([`'x'|'z'`, `'x'|'z'`]);
});
