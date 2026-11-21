import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { parseSerializedProject } from '../examples/examples';
import { conflictsIn, editsOf } from '#parser/editCensus.ts';
import { expect, test } from 'vitest';

/**
 * One slip in any example Wordplay ships is a handful of conflicts, and never a crash.
 *
 * @sweep static/examples A sample of every kind of single-character edit to every
 * single-source example, since what an edit costs depends on what a real program holds:
 * its long text, its nested evaluations, its definitions that everything else uses.
 *
 * `editCascade.test.ts` holds three small programs to tighter ceilings on every edit. This
 * is the same question asked of programs nobody wrote to be a test. Its ceilings only go
 * down. Before the parser recovered from any of this, the worst edit here cost 293.
 */
const Every = 29;
/** Programs past this size cost more than they tell: a converted song is a list of thousands of notes. */
const Largest = 6000;
/** The most that any one sampled edit may cost, and the most they may cost on average. */
/**
 * The one edit that still costs this much is to `Instruments.wp`, which defines a `Voice`
 * of its own: misspell that definition and every `Voice(…)` is an evaluation of the
 * built-in `Voice` instead, each with inputs that don't fit it. Those are true of the
 * program as written, and nothing about how it was parsed.
 */
const Worst = 80;
const Mean = 2.5;
/** How many conflicts is a cascade, and what share of edits may still be one. */
const Many = 20;
const Loud = 0.001;

test(
    'a sampled edit to a shipped example is contained',
    { timeout: 600_000 },
    () => {
        const dir = path.join('static', 'examples');
        let edits = 0;
        let total = 0;
        let worst = { count: 0, where: '' };
        const threw: string[] = [];
        const loud: string[] = [];
        for (const file of readdirSync(dir).filter((name) =>
            name.endsWith('.wp'),
        )) {
            const project = parseSerializedProject(
                readFileSync(path.join(dir, file), 'utf8'),
                file,
            );
            const code = project.sources[0]?.code;
            // One source, since another's names would all be unknown, and no conflicts to begin with.
            if (
                code === undefined ||
                project.sources.length !== 1 ||
                code.length > Largest ||
                conflictsIn(code) !== 0
            )
                continue;
            for (const edit of editsOf(code).filter(
                (_, index) => index % Every === 0,
            )) {
                const count = conflictsIn(edit.code);
                const where = `${file} line ${edit.line} ${edit.kind} ${JSON.stringify(edit.what)}`;
                edits++;
                if (count === 'threw') threw.push(where);
                else {
                    total += count;
                    if (count > Many) loud.push(`${count} ${where}`);
                    if (count > worst.count) worst = { count, where };
                }
            }
        }

        // A guard over nothing is no guard.
        expect(edits).toBeGreaterThan(5000);
        expect(threw, 'the parser must never throw').toEqual([]);
        expect(worst.count, `the worst was ${worst.where}`).toBeLessThanOrEqual(
            Worst,
        );
        expect(total / edits).toBeLessThanOrEqual(Mean);
        expect(
            loud.length / edits,
            `edits costing more than ${Many}: ${loud.join('; ')}`,
        ).toBeLessThanOrEqual(Loud);
    },
);
