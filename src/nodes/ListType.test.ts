import IncompatibleType from '@conflicts/IncompatibleType';
import { testConflict } from '@conflicts/TestUtilities';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import ListLiteral from '@nodes/ListLiteral';
import ListType from '@nodes/ListType';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import TextType from '@nodes/TextType';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import parseType from '@parser/parseType';
import { toTokens } from '@parser/toTokens';
import evaluateCode from '@runtime/evaluate';
import { expect, test } from 'vitest';

function getContext(code = ''): Context {
    const source = new Source('test', code);
    return Project.make(null, 'test', source, [], DefaultLocale).getContext(
        source,
    );
}

function print(node: Node) {
    return node.toWordplay(getPreferredSpaces(node));
}

/**
 * The inferred type of the outermost list literal in the given program. Nodes are listed
 * children-first, so the last list literal is the one that contains any others.
 */
function inferredListType(code: string): string | undefined {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const literal = source.expression
        .nodes()
        .filter((node): node is ListLiteral => node instanceof ListLiteral)
        .at(-1);
    const type = literal?.getType(project.getContext(source));
    return type ? print(type) : undefined;
}

/** The conflicts of every node in the given program. */
function conflictsIn(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return source.expression
        .nodes()
        .flatMap((node) => node.getConflicts(project.getContext(source)));
}

test.each([
    // A list of anything accepts anything, including a list of specific positions.
    ['[]', '[]', true],
    ['[]', '[#]', true],
    ['[]', "[# '']", true],
    // A list of one type accepts a list of unknown items, as before.
    ['[#]', '[]', true],
    ['[#]', '[#]', true],
    ['[#]', "['']", false],
    ["[#|'']", '[#]', true],
    // Positions are compared one by one, and the number of them must match.
    ["[# '']", "[# '']", true],
    ["[# '']", "['' #]", false],
    ["[# '']", "[# '' #]", false],
    ["[#|'' #|'']", "[# '']", true],
    // A list of one type stands in at every position.
    ["[#|'']", "[# '']", true],
    ['[#]', "[# '']", false],
    ['[# #]', '[#]', true],
    // When only one side says what's at each position, all that can be compared is what any item
    // can be, so this is lenient: the items are checked when the list is evaluated.
    ["[# '']", '[#]', true],
    ["[# '']", '[?]', false],
])('%s accepts %s = %s', (expected, given, accepts) => {
    const context = getContext();
    expect(
        parseType(toTokens(expected)).accepts(
            parseType(toTokens(given)),
            context,
        ),
    ).toBe(accepts);
});

test.each([
    // Without a declared type, items of different types are unioned, as before.
    ["[1 'hi']", "[#|'']"],
    ['[1 2 3]', '[#]'],
    ['[]', '[]'],
    // With one, each position keeps its own type.
    ["pair•[# '']: [1 'hi']\npair", "[# '']"],
    // But only when the number of items matches.
    ["pair•[# '']: [1 'hi' 2]\npair", "[#|'']"],
    // A spread makes the length unknown, so positions can't be known either.
    ['rest: [2 3]\npair•[# #]: [1 :rest]\npair', '[#]'],
    // Positions are also known through a type check, an evaluation, and a declared output type.
    ["[1 'hi']•[# '']", "[# '']"],
    ["f: ƒ(pair•[# '']) 1\nf([1 'hi'])", "[# '']"],
    ["f: ƒ()•[# ''] [1 'hi']\nf()", "[# '']"],
    // And through an enclosing list.
    ["pairs•[[# ''] [# '']]: [[1 'a'] [2 'b']]\npairs", "[[# ''] [# '']]"],
    // Items are still generalized, unless the list is exact.
    ["pair•[# '']: [1 'hi']!\npair", "[1 'hi']"],
])('The type of the list in %s is %s', (code, type) => {
    expect(inferredListType(code)).toBe(type);
});

test.each([
    // The items must be of the declared types, in order, and there must be exactly that many.
    ["pair•[# '']: [1 'hi']\npair", "pair•[# '']: ['hi' 1]\npair"],
    ["pair•[# '']: [1 'hi']\npair", 'pair•[# ""]: [1 2]\npair'],
    ["pair•[# '']: [1 'hi']\npair", "pair•[# '']: [1]\npair"],
    ["pair•[# '']: [1 'hi']\npair", "pair•[# '']: []\npair"],
    ["pair•[# '']: [1 'hi']\npair", "pair•[# '']: [1 'hi' 2]\npair"],
    // A list of a known length that isn't the declared one is a conflict, even without positions.
    ['pair•[# #]: [1 2]\npair', 'pair•[# #]: [1 2 3]\npair'],
    // Nested lists are checked position by position, too.
    [
        "pairs•[[# ''] [# '']]: [[1 'a'] [2 'b']]\npairs",
        "pairs•[[# ''] [# '']]: [[1 'a'] ['b' 2]]\npairs",
    ],
])('Expect %s no conflicts, %s to have conflicts', (good, bad) => {
    testConflict(good, bad, Bind, IncompatibleType);
});

test.each([
    // A list of anything and a list of a union still accept a list of mixed items.
    "list•[]: [1 'hi']\nlist",
    "list•[#|'']: [1 'hi']\nlist",
    // Length only has to match when positions are declared.
    'list•[#]: [1 2 3]\nlist',
    // A list whose positions can't be known is accepted, and checked when evaluated.
    "list•[#|'']: [1 'hi']\npair•[# '']: list\npair",
    // The functions of a list still resolve when its positions are known.
    "pair•[# '']: [1 'hi']\npair.length()",
    "pair•[# '']: [1 'hi']\npair.reverse()",
    "pair•[# '']: [1 'hi']\npair.add(2)",
    "pair•[# '']: [1 'hi']\npair → ''",
])('Expect %s to have no conflicts', (code) => {
    expect(conflictsIn(code)).toHaveLength(0);
});

test.each([
    // A list value satisfies a list type with positions only if its items match, in order.
    ["[1 'hi']•[# '']", '⊤'],
    ["['hi' 1]•[# '']", '⊥'],
    ["[1 2]•[# '']", '⊥'],
    ["[1 'hi' 2]•[# '']", '⊥'],
    ['[]•[# ""]', '⊥'],
    // Lists of any length are unaffected.
    ['[1 2]•[#]', '⊤'],
    ["[1 'hi']•[]", '⊤'],
    ["[1 'hi']•[#|'']", '⊤'],
    ['[]•[]', '⊤'],
    // Nested lists are checked all the way down.
    ["[[1 'a'] [2 'b']]•[[# ''] [# '']]", '⊤'],
    ["[[1 'a'] ['b' 2]]•[[# ''] [# '']]", '⊥'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

test.each([
    // A list access with a constant index gets the type of that position, so this is text, not a
    // number, and adding to it is a conflict.
    ["pair•[# '']: [1 'hi']\npair[2]", '"hi"'],
    ["pair•[# '']: [1 'hi']\npair[1] + 1", '2'],
    // The declared positions survive being passed around.
    ["f: ƒ(pair•[# '']) pair[2]\nf([1 'hi'])", '"hi"'],
    ["f: ƒ()•[# ''] [1 'hi']\nf()[2]", '"hi"'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

test('A list type keeps its positions and length when copied and generalized', () => {
    const context = getContext();
    const type = parseType(toTokens("[1 'hi']"));
    expect(type).toBeInstanceOf(ListType);
    expect(print(type.clone())).toBe("[1 'hi']");
    expect(print(type.generalize(context))).toBe("[# '']");
    expect(print(type.simplify(context))).toBe("[1 'hi']");
});

test('An inferred length survives cloning, so it can still be checked', () => {
    const source = new Source('test', '[1 2]');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    const literal = source.expression
        .nodes()
        .find((node): node is ListLiteral => node instanceof ListLiteral);
    const type = literal?.getType(context);
    expect(type).toBeInstanceOf(ListType);
    if (!(type instanceof ListType)) return;
    expect(type.length).toBe(2);
    expect(type.clone().length).toBe(2);
    // Two items, so a type of three positions rejects it.
    expect(
        ListType.tuple([
            TextType.make(),
            TextType.make(),
            TextType.make(),
        ]).accepts(type, context),
    ).toBe(false);
});
