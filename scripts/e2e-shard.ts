/**
 * Print the `file:line` locations one CI shard should run, one per line.
 *
 * Playwright's own `--shard` cuts the test list into contiguous runs in file
 * order, so the shard that draws the first files draws the accessibility
 * specs, whose tests are the slowest in the suite: measured over four shards,
 * the first had 558 test-seconds and the third 314, and the gate is the
 * slowest shard. This deals tests out instead, largest location first to the
 * shard holding the fewest, so slow files are spread across every shard and
 * growth lands wherever there is room.
 *
 * A location rather than a test is the unit because a filter names a line, and
 * a loop declares several tests on one line; the filter runs all of them, so
 * they have to go to the same shard or they would run on several.
 *
 * Usage: npx tsx scripts/e2e-shard.ts <current> <total> [playwright args...]
 * The extra arguments (e.g. `--project=chromium`) go to `playwright --list`.
 */
import { execFileSync } from 'node:child_process';
import { relative } from 'node:path';
import { z } from 'zod';

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

/** The parts of Playwright's JSON report a `--list` run fills in. */
type Suite = {
    specs?: { file: string; line: number; tests: unknown[] }[] | undefined;
    suites?: Suite[] | undefined;
};
const Suite: z.ZodType<Suite> = z.object({
    specs: z
        .array(
            z.object({
                file: z.string(),
                line: z.number(),
                tests: z.array(z.unknown()),
            }),
        )
        .optional(),
    get suites() {
        return z.array(Suite).optional();
    },
});
const Report = z.object({
    config: z.object({ rootDir: z.string() }),
    suites: z.array(Suite),
});

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

/** How many tests each location declares, in the order Playwright lists them. */
const locations = new Map<string, number>();
function collect(suite: Suite) {
    for (const spec of suite.specs ?? []) {
        const location = `${testDirectory}/${spec.file}:${spec.line}`;
        locations.set(
            location,
            (locations.get(location) ?? 0) + spec.tests.length,
        );
    }
    for (const child of suite.suites ?? []) collect(child);
}
for (const suite of report.suites) collect(suite);

// Largest first, then in listed order, so every shard computes the same deal.
const loads = Array.from({ length: total }, () => 0);
const mine: string[] = [];
for (const [location, count] of [...locations].sort((a, b) => b[1] - a[1])) {
    let lightest = 0;
    for (let shard = 1; shard < total; shard++)
        if ((loads[shard] ?? 0) < (loads[lightest] ?? 0)) lightest = shard;
    loads[lightest] = (loads[lightest] ?? 0) + count;
    if (lightest === current - 1) mine.push(location);
}

// Given no locations, `playwright test` would run everything, so an empty shard
// is a failure rather than a quiet way to run the whole suite five times.
if (mine.length === 0) {
    console.error(`Shard ${current} of ${total} has no tests.`);
    process.exit(1);
}
console.log(mine.join('\n'));
