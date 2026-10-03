/**
 * Rewrite tests/e2e-timings.json from a CI run's Playwright reports, so
 * scripts/e2e-shard.ts deals tests by what they cost now.
 *
 * The timings are committed rather than fetched at run time because every
 * shard has to compute the same deal: shards reading two different "latest"
 * runs would each skip some tests and run others twice. A stale file costs
 * balance, never coverage — an unrecorded test is estimated at the median — so
 * refresh it when a PR's shards finish far apart, not on a schedule.
 *
 * Usage: npm run e2e-timings -- <run id>   (the run of a green Verify PR or
 * deploy; `gh run list --workflow=pr.yml` lists them)
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { namedSpecs, Report } from './playwrightReport.ts';

const [, , runID] = process.argv;
if (runID === undefined || !/^\d+$/.test(runID)) {
    console.error('Usage: npm run e2e-timings -- <run id>');
    process.exit(1);
}

const directory = mkdtempSync(join(tmpdir(), 'e2e-timings-'));
execFileSync(
    'gh',
    [
        'run',
        'download',
        runID,
        '--pattern',
        'playwright-report-chromium-shard*',
        '--dir',
        directory,
    ],
    { stdio: 'inherit' },
);

const timings: Record<string, number> = {};
for (const shard of readdirSync(directory)) {
    const report = Report.parse(
        JSON.parse(
            readFileSync(
                join(directory, shard, 'playwright-report.json'),
                'utf8',
            ),
        ),
    );
    for (const { name, spec } of namedSpecs(report)) {
        // The last attempt, which is the one that passed if any did; a failed
        // first attempt's duration is a timeout, not what the test costs.
        const duration = spec.tests[0]?.results?.at(-1)?.duration;
        if (duration !== undefined)
            timings[name] = Math.round(duration / 100) / 10;
    }
}

const sorted = Object.fromEntries(
    Object.entries(timings).sort(([a], [b]) => a.localeCompare(b)),
);
writeFileSync('tests/e2e-timings.json', `${JSON.stringify(sorted, null, 4)}\n`);
console.log(
    `Recorded ${Object.keys(sorted).length} tests from run ${runID} in tests/e2e-timings.json.`,
);
