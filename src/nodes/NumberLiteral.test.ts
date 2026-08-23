import { testConflict } from '@conflicts/TestUtilities';
import { NotANumber } from '@conflicts/NotANumber';
import NumberLiteral from '@nodes/NumberLiteral';
import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';

// One case per conflict this node raises, so a conflict reachable from several
// nodes is covered from each of them; see conflictCoverage.test.ts.
test.each([['2;1', '2;9', NumberLiteral, NotANumber, 0]])(
    '%s => no conflict, %s => conflict',
    (good, bad, node, conflict, index) => {
        testConflict(good, bad, node, conflict, index);
    },
);

/** Every conflict on the program, by class name. */
function conflicts(code: string): string[] {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    return [...source.nodes()].flatMap((n) =>
        n.getConflicts(context).map((c) => c.constructor.name),
    );
}

// `!#` says not-a-number on purpose, so it isn't a mistake. The conflict is for
// a number we couldn't read at all, like base 2 with a digit 9.
test.each([
    ['!#', 0],
    ['!#m', 0],
    ['2;9', 1],
])('%s raises %i NotANumber conflicts', (code, count) => {
    expect(conflicts(code).filter((c) => c === 'NotANumber')).toHaveLength(
        count,
    );
});

test('the literal evaluates to not-a-number', () => {
    expect(evaluateCode('!#')?.toWordplay()).toBe('!#');
});
