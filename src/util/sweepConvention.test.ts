import { readFileSync } from 'fs';
import { resolve } from 'path';
import { expect, test } from 'vitest';
import IsolatedTests from './isolatedTests';
import SweepTests, { SweepMarker, SweepTriggers } from './sweepTests';
import testFilesUnder, { RepoRoot, repoRelative } from './testFiles';

/**
 * Guard for the `sweep` project in vitest.config.ts, in the shape
 * testIsolationConvention.test.ts already uses: the project is exactly the files
 * that declare `@sweep`. A listed file with no marker is one whose reason was
 * never written down; a marked file that isn't listed is one nobody runs, and
 * its symptom is silence rather than a failure.
 */

/** Skipped because this file names the marker in its own source, and so always matches itself. */
const Self = 'src/util/sweepConvention.test.ts';

test('the sweep project is exactly the test files that declare @sweep', () => {
    const marked = testFilesUnder(resolve(RepoRoot, 'src'))
        .filter((path) => SweepMarker.test(readFileSync(path, 'utf-8')))
        .map(repoRelative)
        .filter((path) => path !== Self)
        .sort();
    expect(
        marked,
        `The files declaring "@sweep <corpus root> <reason>" and the list in src/util/sweepTests.ts disagree. A sweep must do both: the list is what vitest.config.ts reads, and the marker is where the reason lives. Note that a listed file does NOT run in "npm run test:run" — if what you wrote is a test of code rather than of the corpus, take it out of both.`,
    ).toEqual([...SweepTests].sort());
});

test('no test file is both isolated and swept', () => {
    // Two projects can't own one file: it would run twice, and the sweep project
    // is unisolated, so a mocking file listed here would leak its mock.
    expect(
        SweepTests.filter((path) => IsolatedTests.includes(path)),
        'These files are in both src/util/isolatedTests.ts and src/util/sweepTests.ts.',
    ).toEqual([]);
});

test('the pre-commit hook runs the sweep for every corpus it verifies', () => {
    // Taking the sweeps out of the default run is only safe because staging their
    // corpus runs them. If the hook stops triggering on one, that sweep is
    // unreachable until CI — which is the gap this split was meant to avoid.
    const hook = readFileSync(
        resolve(RepoRoot, '.githooks/pre-commit'),
        'utf-8',
    );
    expect(
        SweepTriggers.filter((trigger) => !hook.includes(trigger)),
        'These sweep triggers from src/util/sweepTests.ts are missing from .githooks/pre-commit.',
    ).toEqual([]);
});

test('the default test scripts do not run the sweep', () => {
    const scripts = (
        JSON.parse(
            readFileSync(resolve(RepoRoot, 'package.json'), 'utf-8'),
        ) as {
            scripts: Record<string, string>;
        }
    ).scripts;
    // Named projects rather than `--project='!sweep'`: vitest supports the
    // negation, but a leading `!` in a package.json script quotes differently on
    // sh and cmd.exe, and this repo already reaches for run-script-os when a
    // script has to be platform-aware.
    expect(scripts['test']).toBe('vitest --project=fast --project=isolated');
    expect(scripts['test:run']).toBe(
        'vitest run --project=fast --project=isolated',
    );
    expect(scripts['test:sweep']).toBe('vitest run --project=sweep');
});
