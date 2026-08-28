import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve, sep } from 'path';
import { expect, test } from 'vitest';
import { MockingTests } from './isolatedTests';

/**
 * Guard for the two-project split in vitest.config.ts: the `mocked` project is exactly the files
 * that call `vi.mock`. An unlisted one runs unisolated, where its mock leaks into every later file
 * in the same worker — so the symptom is a confusing failure somewhere else, never here.
 */

/** Skipped because this file names the call in its own message, and so always matches itself. */
const Self = 'src/util/testIsolationConvention.test.ts';

function testFilesUnder(directory: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        if (statSync(path).isDirectory()) found.push(...testFilesUnder(path));
        else if (entry.endsWith('.test.ts')) found.push(path);
    }
    return found;
}

test('the isolated project is exactly the test files that mock modules', () => {
    const root = resolve(__dirname, '../..');
    const mocking = testFilesUnder(resolve(root, 'src'))
        .filter((path) => readFileSync(path, 'utf-8').includes('vi.mock('))
        .map((path) => relative(root, path).split(sep).join('/'))
        .filter((path) => path !== Self)
        .sort();
    expect(
        mocking,
        `The files calling vi.mock and the MockingTests list in src/util/isolatedTests.ts disagree. Add a new mocking test file to that list so it runs isolated; remove one that no longer calls vi.mock so it runs in the fast project.`,
    ).toEqual([...MockingTests].sort());
});
