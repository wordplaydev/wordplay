/**
 * Print the `file:line` locations one CI shard should run, one per line.
 *
 * Playwright's own `--shard` cuts the test list into contiguous runs in file
 * order, so the shard that draws the first files draws the accessibility
 * specs, whose tests are the slowest in the suite: measured over four shards,
 * the first had 558 test-seconds and the third 314, and the gate is the
 * slowest shard. This deals locations out instead, longest first to the shard
 * with the least to do, estimating each test from the durations last recorded
 * in tests/e2e-timings.json (refreshed by scripts/e2e-timings.ts). Dealing by
 * count was tried first and stopped working once tests were merged: a merged
 * test is several tests long.
 *
 * A location rather than a test is the unit because a filter names a line, and
 * a loop declares several tests on one line; the filter runs all of them, so
 * they have to go to the same shard or they would run on several. A test with
 * no recorded duration — new, or renamed — is estimated at the median.
 *
 * Usage: npx tsx scripts/e2e-shard.ts <current> <total> [playwright args...]
 * The extra arguments (e.g. `--project=chromium`) go to `playwright --list`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { z } from 'zod';
import { namedSpecs, Report } from './playwrightReport.ts';

const [, , currentArgument, totalArgument, ...listArguments] = process.argv;
const current = Number(currentArgument);
const total = Number(totalArgument);
if (
    !Number.isInteger(current) ||
    !Number.isInteger(total) ||
    current < 1 ||
    current > total
) {
    console.error('Usage: e2e-shard.ts <current> <total> [playwright args...]');
    process.exit(1);
}

const timings = z
    .record(z.string(), z.number())
    .parse(JSON.parse(readFileSync('tests/e2e-timings.json', 'utf8')));
const recorded = Object.values(timings).sort((a, b) => a - b);
const median = recorded[Math.floor(recorded.length / 2)] ?? 5;

const report = Report.parse(
    JSON.parse(
        execFileSync(
            'npx',
            [
                'playwright',
                'test',
                '--list',
                '--reporter=json',
                ...listArguments,
            ],
            {
                encoding: 'utf8',
                maxBuffer: 64 * 1024 * 1024,
                env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: '' },
            },
        ),
    ),
);

// Spec files are reported relative to the test directory; a filter is matched
// against the whole path, so it is given from the working directory. That also
// keeps `project.spec.ts` from matching `unauthenticated-project.spec.ts`.
const testDirectory = relative(process.cwd(), report.config.rootDir);

/** Estimated seconds at each location, in the order Playwright lists them. */
const locations = new Map<string, number>();
let unrecorded = 0;
for (const { name, spec } of namedSpecs(report)) {
    const location = `${testDirectory}/${spec.file}:${spec.line}`;
    const seconds = timings[name];
    if (seconds === undefined) unrecorded++;
    locations.set(
        location,
        (locations.get(location) ?? 0) +
            (seconds ?? median) * spec.tests.length,
    );
}

// Longest first, then in listed order, so every shard computes the same deal.
const loads = Array.from({ length: total }, () => 0);
const mine: string[] = [];
for (const [location, seconds] of [...locations].sort((a, b) => b[1] - a[1])) {
    let lightest = 0;
    for (let shard = 1; shard < total; shard++)
        if ((loads[shard] ?? 0) < (loads[lightest] ?? 0)) lightest = shard;
    loads[lightest] = (loads[lightest] ?? 0) + seconds;
    if (lightest === current - 1) mine.push(location);
}

// Given no locations, `playwright test` would run everything, so an empty shard
// is a failure rather than a quiet way to run the whole suite five times.
if (mine.length === 0) {
    console.error(`Shard ${current} of ${total} has no tests.`);
    process.exit(1);
}
// To stderr, so the log says how stale the deal was without it becoming a
// location.
console.error(
    `Shard ${current} of ${total}: ~${Math.round(loads[current - 1] ?? 0)} test-seconds estimated; ${unrecorded} tests had no recorded duration.`,
);
console.log(mine.join('\n'));
