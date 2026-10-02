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
 * Reads the report path from argv[2] and appends to $GITHUB_STEP_SUMMARY (or
 * prints to stdout when that isn't set, so it is runnable by hand).
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { messageOf } from '#util/guards.ts';

const [, , reportPath = 'playwright-report.json', label = 'Playwright'] =
    process.argv;

/** The parts of Playwright's JSON report this reads; the rest passes through. */
const Spec = z.object({
    file: z.string(),
    line: z.number(),
    title: z.string(),
    tests: z
        .array(
            z.object({
                status: z.string(),
                results: z.array(z.unknown()).optional(),
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

/** Every spec in the report, flattened out of the suite tree. */
function specsOf(suite: Suite): z.infer<typeof Spec>[] {
    return [
        ...(suite.specs ?? []),
        ...(suite.suites ?? []).flatMap((child) => specsOf(child)),
    ];
}

function summarize(report: Suite): { failed: Entry[]; flaky: Entry[] } {
    const failed: Entry[] = [];
    const flaky: Entry[] = [];
    for (const spec of specsOf(report)) {
        for (const test of spec.tests ?? []) {
            // `where` names the file and line so a reader can open it, which is
            // the whole point of reporting this rather than a count.
            const where = `${spec.file}:${spec.line} › ${spec.title}`;
            const attempts = (test.results ?? []).length;
            if (test.status === 'unexpected') failed.push({ where, attempts });
            else if (test.status === 'flaky') flaky.push({ where, attempts });
        }
    }
    return { failed, flaky };
}

function render({ failed, flaky }: { failed: Entry[]; flaky: Entry[] }) {
    if (failed.length === 0 && flaky.length === 0)
        return `### ${label}: no failures and nothing flaky\n`;
    const lines = [`### ${label}\n`];
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
