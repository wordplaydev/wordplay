/**
 * The parts of Playwright's JSON report that the e2e sharding scripts read,
 * shared so the timings they record and the tests they deal agree on what a
 * test is called.
 */
import { z } from 'zod';

export type Suite = {
    title: string;
    specs?:
        | {
              file: string;
              line: number;
              title: string;
              tests: {
                  results?: { duration?: number | undefined }[] | undefined;
              }[];
          }[]
        | undefined;
    suites?: Suite[] | undefined;
};

export const Suite: z.ZodType<Suite> = z.object({
    title: z.string(),
    specs: z
        .array(
            z.object({
                file: z.string(),
                line: z.number(),
                title: z.string(),
                tests: z.array(
                    z.object({
                        results: z
                            .array(
                                z.object({ duration: z.number().optional() }),
                            )
                            .optional(),
                    }),
                ),
            }),
        )
        .optional(),
    get suites() {
        return z.array(Suite).optional();
    },
});

export const Report = z.object({
    config: z.object({ rootDir: z.string() }),
    suites: z.array(Suite),
});
export type Report = z.infer<typeof Report>;

export type Spec = NonNullable<Suite['specs']>[number];

/**
 * Every spec in a report with the name it is timed under: its file, then each
 * describe it sits in, then its title. A name rather than a line, so editing
 * a file above a test doesn't orphan its timing.
 */
export function namedSpecs(report: Report): { name: string; spec: Spec }[] {
    const named: { name: string; spec: Spec }[] = [];
    function visit(suite: Suite, describes: string[]) {
        for (const spec of suite.specs ?? [])
            named.push({
                name: [spec.file, ...describes, spec.title].join(' › '),
                spec,
            });
        for (const child of suite.suites ?? [])
            visit(child, [...describes, child.title]);
    }
    // A top-level suite is a file, whose title is the file name the specs
    // already carry.
    for (const file of report.suites) visit(file, []);
    return named;
}
