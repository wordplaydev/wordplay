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

/**
 * `&` and `|` short-circuit, so the right only runs once the left is decided: with `&`
 * the left was true, with `|` it was false. Either way the left is the check and the
 * right is what it narrows. `|` never narrowed its right at all, and the search for a
 * guarding ancestor looked at the right rather than the left — which worked for `&` only
 * because every binary operator reports that it guards types, so a reference under any
 * operator counted while one passed as a plain argument did not.
 */
test.each([
    [
        '| narrows its right with the left being false',
        `((a•#) | (h(a) = 'q')) ? 1 2`,
    ],
    [
        '& narrows its right with the left being true',
        `((a•'') & (h(a) = 'q')) ? 1 2`,
    ],
    ['| reaches a plain argument', `((a•#) | (h(a) ≠ 'q')) ? 1 2`],
])('%s', (_name, program) => {
    expect(conflictsIn(`a•#|'': 1\nƒ h(t•'') t\n` + program)).toEqual([]);
});

/** A left that decides nothing must leave the right's types alone rather than
 *  subtracting everything, which would leave the right with no types at all. */
test('a non-narrowing left leaves the right unnarrowed', () => {
    expect(
        conflictsIn(`a•#|'': 1\nb: ⊤\nƒ h(t•#|'') t\n(b | (h(a) = 1)) ? 1 2`),
    ).toEqual([]);
});

/**
 * A name for a literal collection has that collection's length, so `items.length()`
 * proves a divisor non-zero the way `[1 2 3].length()` does — naming the list is the
 * ordinary way to write it. An input's default doesn't count, since a caller may pass
 * an empty list.
 */
test('a name for a literal collection has its length', () => {
    expect(conflictsIn(`g: [1 2 3]\n(5 % g.length()) + 1`)).toEqual([]);
    expect(conflictsIn(`(5 % [1 2 3].length()) + 1`)).toEqual([]);
    // An empty list proves nothing, so the remainder may still be ø.
    expect(conflictsIn(`g: []\n(5 % g.length()) + 1`)).not.toEqual([]);
    // A default is not the value.
    expect(
        conflictsIn(`ƒ f(g•[#]: [1 2 3]) ((5 % g.length()) + 1)\nf([])`),
    ).not.toEqual([]);
});
