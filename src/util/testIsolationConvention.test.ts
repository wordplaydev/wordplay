import { readFileSync } from 'fs';
import { resolve } from 'path';
import { expect, test } from 'vitest';
import { MockingTests } from './isolatedTests';
import testFilesUnder, { RepoRoot, repoRelative } from './testFiles';

/**
 * Guard for the two-project split in vitest.config.ts: the `mocked` project is exactly the files
 * that call `vi.mock`. An unlisted one runs unisolated, where its mock leaks into every later file
 * in the same worker — so the symptom is a confusing failure somewhere else, never here.
 */

/** Skipped because this file names the call in its own message, and so always matches itself. */
const Self = 'src/util/testIsolationConvention.test.ts';

test('the isolated project is exactly the test files that mock modules', () => {
    // `functions/src` as well as `src`: the fast project excludes only
    // `functions/lib`, so a functions test runs unisolated alongside everything
    // else and its mock leaks exactly the same way. Nothing caught that until
    // #1347 nearly added the first one.
    const mocking = ['src', 'functions/src']
        .flatMap((directory) => testFilesUnder(resolve(RepoRoot, directory)))
        .filter((path) => readFileSync(path, 'utf-8').includes('vi.mock('))
        .map(repoRelative)
        .filter((path) => path !== Self)
        .sort();
    expect(
        mocking,
        `The files calling vi.mock and the MockingTests list in src/util/isolatedTests.ts disagree. Add a new mocking test file to that list so it runs isolated; remove one that no longer calls vi.mock so it runs in the fast project.`,
    ).toEqual([...MockingTests].sort());
});
