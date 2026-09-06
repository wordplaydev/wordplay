import { readdirSync, statSync } from 'fs';
import { join, relative, resolve, sep } from 'path';

/** The repository root, from this file's location. */
export const RepoRoot = resolve(__dirname, '../..');

/**
 * Every `.test.ts` under a directory, recursively. Shared by the two conventions
 * that hold vitest.config.ts's project lists to what the tree actually contains
 * — `testIsolationConvention` and `sweepConvention` — so that a file counted by
 * one is counted by the other, and neither can disagree about what a test file is.
 */
export default function testFilesUnder(directory: string): string[] {
    const found: string[] = [];
    for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        if (statSync(path).isDirectory()) found.push(...testFilesUnder(path));
        else if (entry.endsWith('.test.ts')) found.push(path);
    }
    return found;
}

/** A path as the project lists spell it: repo-relative, forward slashes. */
export function repoRelative(path: string): string {
    return relative(RepoRoot, path).split(sep).join('/');
}
