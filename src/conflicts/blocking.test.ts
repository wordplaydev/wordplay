import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

/**
 * Blocks mode blocks an edit only when it would make the program structurally unparsable; every
 * semantic conflict — whatever its severity — is permitted and explained, since a creator can
 * repair it in place. That policy lives in Conflict.isBlocking(), overridden to true only by
 * UnparsableConflict. These tests keep that set from drifting: a new blocking conflict is a
 * deliberate, test-visible decision.
 */

test('only UnparsableConflict overrides isBlocking', () => {
    const dir = path.join('src', 'conflicts');
    const defining = readdirSync(dir)
        .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
        .filter((name) =>
            readFileSync(path.join(dir, name), 'utf8').includes('isBlocking('),
        )
        .sort();
    expect(defining).toEqual(['Conflict.ts', 'UnparsableConflict.ts']);
});

test('a type mismatch is an error, but does not block', () => {
    const source = new Source('test', 'a•#: "hi"');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const mismatch = project
        .getMajorConflictsNow()
        .find((conflict) => conflict.constructor.name === 'IncompatibleType');
    expect(mismatch).toBeDefined();
    // Still an error-severity conflict, rendered as such...
    expect(mismatch?.getSeverity()).toBe('error');
    // ...but it doesn't gate blocks-mode edits.
    expect(mismatch?.isBlocking()).toBe(false);
});

test('unparsable code blocks', () => {
    const source = new Source('test', '1 + )');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const unparsable = project
        .getMajorConflictsNow()
        .find((conflict) => conflict.constructor.name === 'UnparsableConflict');
    expect(unparsable).toBeDefined();
    expect(unparsable?.isBlocking()).toBe(true);
});
