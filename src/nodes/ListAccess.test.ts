import UnclosedDelimiter from '#conflicts/UnclosedDelimiter.ts';
import { testConflict } from '#conflicts/TestUtilities.ts';
import { UnknownName } from '#conflicts/UnknownName.ts';
import { expect, test } from 'vitest';
import IncompatibleInput from '#conflicts/IncompatibleInput.ts';
import BinaryEvaluate from '#nodes/BinaryEvaluate.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import evaluateCode from '#runtime/evaluate.ts';
import ListAccess from '#nodes/ListAccess.ts';
import Reference from '#nodes/Reference.ts';
import Source from '#nodes/Source.ts';
import getPreferredSpaces from '#parser/getPreferredSpaces.ts';

test.each([
    ['[1 2 3][0]', '[1 2 "hi"]["hi"]', ListAccess, IncompatibleInput, 0],
    ['[1][1]', '1[1]', ListAccess, IncompatibleInput, 0],
    // Verify that type guards are working on list accesses.
    [
        'list: [1 2 ø 3]\nlist[2]•ø ? 1 list[2] + 1',
        'list: [1 2 ø 3]\nlist[2]•# ? 1 list[2] + 1',
        Reference,
        UnknownName,
        2,
    ],
])('%s => no conflict, %s => conflict', (good, bad, node, conflict, index) => {
    testConflict(good, bad, node, conflict, index);
});

test('a constant index into a list type of several positions gets that position type', () => {
    // Dividing the number at position 1 is fine; dividing the text at position 2 isn't.
    testConflict(
        "pair•[# '']: [1 'hi']\npair[1] ÷ 2",
        "pair•[# '']: [1 'hi']\npair[2] ÷ 2",
        BinaryEvaluate,
        IncompatibleInput,
    );
});

test.each([
    // The type of a constant index is the type at that position.
    ["pair•[# '']: [1 'hi']\npair[1]", '#'],
    ["pair•[# '']: [1 'hi']\npair[2]", "''"],
    // An index that isn't a constant in range could be any item, since indices wrap around.
    ["pair•[# '']: [1 'hi']\npair[3]", "#|''"],
    ["pair•[# '']: [1 'hi']\npair[0]", "#|''"],
    ["pair•[# '']: [1 'hi']\ni: 1 + 1\npair[i]", "#|''"],
])('The type of %s is %s', (code, expected) => {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const access = source.expression
        .nodes()
        .filter((node): node is ListAccess => node instanceof ListAccess)
        .at(-1);
    const type = access?.getType(project.getContext(source));
    expect(type ? type.toWordplay(getPreferredSpaces(type)) : undefined).toBe(
        expected,
    );
});

test.each([
    ['[1 2 3][2]', '2'],
    ['[1 2 3][5]', '2'],
    ['[1 2 3][0]', 'ø'],
    ['[1 2 3][-1]', '3'],
    ['[1 2 3][-3]', '1'],
    ['[1 2 3][-4]', '3'],
])('Expect %s to be %s', (code, value) => {
    expect(evaluateCode(code)?.toString()).toBe(value);
});

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([['[1][1]', '[1][1', ListAccess, UnclosedDelimiter, 0]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, index) => {
        testConflict(good, bad, node, conflict, index);
    },
);
