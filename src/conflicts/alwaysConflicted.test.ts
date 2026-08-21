import { conflictsIn } from '@conflicts/TestUtilities';
import Placeholder from '@conflicts/Placeholder';
import { UnexpectedTypeVariable } from '@conflicts/UnexpectedTypeVariable';
import { UnparsableConflict } from '@conflicts/UnparsableConflict';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Reference from '@nodes/Reference';
import Source from '@nodes/Source';
import TypePlaceholder from '@nodes/TypePlaceholder';
import UnparsableExpression from '@nodes/UnparsableExpression';
import UnparsableType from '@nodes/UnparsableType';
import { expect, test } from 'vitest';

/**
 * Conflicts whose node exists only when it is already in conflict, so the
 * good/bad pair `testConflict` wants can't be written: there is no
 * unconflicted `TypePlaceholder` or `UnparsableExpression` to compare against.
 * Asserted directly instead, still naming the node so the coverage guard sees
 * which raiser each case exercises.
 */

/** Which node classes raise which conflicts in this code. */
function raised(code: string): string[] {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    const pairs: string[] = [];
    for (const node of source.nodes())
        for (const conflict of node.getConflicts(context))
            pairs.push(
                `${conflict.constructor.name}<-${node.constructor.name}`,
            );
    return pairs;
}

test('a TypePlaceholder always raises Placeholder', () => {
    expect(raised('a•_: 1\na')).toContain(
        `${Placeholder.name}<-${TypePlaceholder.name}`,
    );
    // And a real type doesn't leave one behind.
    expect(conflictsIn('a•#: 1\na')).not.toContain(Placeholder.name);
});

test('an UnparsableExpression always raises UnparsableConflict', () => {
    expect(raised('1[')).toContain(
        `${UnparsableConflict.name}<-${UnparsableExpression.name}`,
    );
    expect(conflictsIn('1')).not.toContain(UnparsableConflict.name);
});

test('an UnparsableType always raises UnparsableConflict', () => {
    expect(raised('a•⬚: 1\na')).toContain(
        `${UnparsableConflict.name}<-${UnparsableType.name}`,
    );
    expect(conflictsIn('a•#: 1\na')).not.toContain(UnparsableConflict.name);
});

test('a Reference to a type variable raises UnexpectedTypeVariable', () => {
    // The good case has no Reference to the variable at all, so there is no
    // unconflicted Reference of the same shape to compare against.
    expect(raised('•T⸨V⸩() (V)\n1')).toContain(
        `${UnexpectedTypeVariable.name}<-${Reference.name}`,
    );
    expect(conflictsIn('•T⸨V⸩() ()\n1')).not.toContain(
        UnexpectedTypeVariable.name,
    );
});
