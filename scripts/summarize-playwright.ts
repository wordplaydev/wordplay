/**
 * Turn a Playwright JSON report into a GitHub job summary naming the tests that
 * failed and the ones that only passed on a retry.
 *
 * Working out why the WebKit nightly was red meant downloading artifacts and
 * slicing 400-line log tails, because the `list` reporter's summary scrolls off
 * and nothing else records which tests were merely flaky. That archaeology is
 * worth paying for once. Flaky tests are the interesting half: a suite that goes
 * green on the second attempt is on its way to going red, and only the retry
 * count says so.
 *
 * It also reports what the report cost in test-seconds, warning (never failing)
 * when that passes the budget the workflow gives it.
 *
 * Reads the report path from argv[2], a label from argv[3] and an optional
 * budget in test-seconds from argv[4], and appends to $GITHUB_STEP_SUMMARY (or
 * prints to stdout when that isn't set, so it is runnable by hand).
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { messageOf } from '#util/guards.ts';

const [
    ,
    ,
    reportPath = 'playwright-report.json',
    label = 'Playwright',
    budgetArgument,
] = process.argv;

/** Test-seconds this report is expected to fit in, if the caller gave one. */
const budget =
    budgetArgument === undefined || Number.isNaN(Number(budgetArgument))
        ? undefined
        : Number(budgetArgument);

/** The parts of Playwright's JSON report this reads; the rest passes through. */
const Spec = z.object({
    file: z.string(),
    line: z.number(),
    title: z.string(),
    tests: z
        .array(
            z.object({
                status: z.string(),
                results: z
                    .array(z.object({ duration: z.number().optional() }))
                    .optional(),
            }),
        )
        .optional(),
});
type Suite = {
    specs?: z.infer<typeof Spec>[] | undefined;
    suites?: Suite[] | undefined;
};
const Suite: z.ZodType<Suite> = z.object({
    specs: z.array(Spec).optional(),
    get suites() {
        return z.array(Suite).optional();
    },
});

type Entry = { where: string; attempts: number };
type Timing = { where: string; file: string; seconds: number };

/** Every spec in the report, flattened out of the suite tree. */
function specsOf(suite: Suite): z.infer<typeof Spec>[] {
    return [
        ...(suite.specs ?? []),
        ...(suite.suites ?? []).flatMap((child) => specsOf(child)),
    ];
}

type Summary = { failed: Entry[]; flaky: Entry[]; timings: Timing[] };

function summarize(report: Suite): Summary {
    const failed: Entry[] = [];
    const flaky: Entry[] = [];
    const timings: Timing[] = [];
    for (const spec of specsOf(report)) {
        for (const test of spec.tests ?? []) {
            // `where` names the file and line so a reader can open it, which is
            // the whole point of reporting this rather than a count.
            const where = `${spec.file}:${spec.line} › ${spec.title}`;
            const attempts = (test.results ?? []).length;
            if (test.status === 'unexpected') failed.push({ where, attempts });
            else if (test.status === 'flaky') flaky.push({ where, attempts });
            // Every attempt counts: a retry costs the shard as much wall clock
            // as the first try did.
            const seconds =
                (test.results ?? []).reduce(
                    (sum, result) => sum + (result.duration ?? 0),
                    0,
                ) / 1000;
            timings.push({ where, file: spec.file, seconds });
        }
    }
    return { failed, flaky, timings };
}

/**
 * The suite's cost, against a budget. Test-seconds rather than the step's wall
 * clock, because they are what a new test adds and what a shard's share of the
 * suite is made of; the gate is roughly a shard's test-seconds over its workers
 * plus fixed setup. Warns and never fails: the budget is there so growth is
 * noticed in the PR that causes it, not to block one.
 */
function renderCost(timings: Timing[]): string[] {
    const total = timings.reduce((sum, { seconds }) => sum + seconds, 0);
    const lines = [
        `**${Math.round(total)} test-seconds** over ${timings.length} tests${
            budget === undefined ? '' : ` (budget ${budget})`
        }\n`,
    ];
    if (budget !== undefined && total > budget) {
        const byFile = new Map<string, number>();
        for (const { file, seconds } of timings)
            byFile.set(file, (byFile.get(file) ?? 0) + seconds);
        const heaviest = [...byFile]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([file, seconds]) => `${file} (${Math.round(seconds)}s)`)
            .join(', ');
        const message = `${label} is over its e2e budget: ${Math.round(total)} of ${budget} test-seconds. Heaviest files: ${heaviest}. Can any of this be a unit test, or an assertion in a test already in the needed state?`;
        // A workflow command, so the warning appears on the run's summary page
        // and not only inside this step's log.
        console.log(`::warning title=E2E budget::${message}`);
        lines.push(`> [!WARNING]\n> ${message}\n`);
    }
    lines.push('<details><summary>Slowest tests</summary>\n');
    for (const { where, seconds } of [...timings]
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 10))
        lines.push(`- ${seconds.toFixed(1)}s \`${where}\``);
    lines.push('\n</details>\n');
    return lines;
}

function render({ failed, flaky, timings }: Summary) {
    const cost = renderCost(timings);
    if (failed.length === 0 && flaky.length === 0)
        return [`### ${label}: no failures and nothing flaky\n`, ...cost].join(
            '\n',
        );
    const lines = [`### ${label}\n`, ...cost];
    const list = (title: string, entries: Entry[]) => {
        if (entries.length === 0) return;
        lines.push(`**${title}**\n`);
        for (const { where, attempts } of entries)
            lines.push(
                `- \`${where}\` (${attempts} attempt${attempts === 1 ? '' : 's'})`,
            );
        lines.push('');
    };
    list(`Failed (${failed.length})`, failed);
    list(`Flaky — passed only on a retry (${flaky.length})`, flaky);
    return lines.join('\n');
}

let report: Suite;
try {
    report = Suite.parse(JSON.parse(readFileSync(reportPath, 'utf8')));
} catch (error) {
    // Never fail the job over the summary: the test result is the thing that
    // matters, and a missing report means the run died before writing one.
    console.error(`Could not read ${reportPath}:`, messageOf(error));
    process.exit(0);
}

const text = render(summarize(report));
const target = process.env.GITHUB_STEP_SUMMARY;
if (target) appendFileSync(target, `${text}\n`);
else console.log(text);
