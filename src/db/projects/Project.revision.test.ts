import { readFileSync } from 'fs';
import { resolve } from 'path';
import { expect, test } from 'vitest';

/**
 * Guard for `Project.revised()`.
 *
 * Every per-source analysis cache lives on the `Project` instance, and an edit
 * makes a new `Project`. `revised()` carries those caches to the next one;
 * a plain `new Project({ ...this.data, x })` starts cold, which means
 * re-inferring and re-analyzing every source in the project — including ones
 * the edit never touched.
 *
 * That is not a hypothetical. Typing one character builds four projects
 * (`withSource` → `withCaret` → `bumpStampsFrom` → `withNewTime`), and for a
 * while only the first carried anything, so the project the UI actually
 * rendered had no caches at all. Nothing failed; typing just got slow. This
 * test is the thing that fails instead.
 *
 * The two static factories are exempt: they build a project from serialized
 * text or from scratch, so there is no predecessor whose caches could apply.
 */
const STATIC_FACTORIES = 2;

test('Project builds revisions through revised(), not bare constructions', () => {
    const source = readFileSync(
        resolve(__dirname, 'Project.ts'),
        'utf-8',
    ).split('\n');

    const bare = source
        .map((line, index) => ({ line: line.trim(), number: index + 1 }))
        // Prose about the rule is not a violation of it.
        .filter(({ line }) => !line.startsWith('*') && !line.startsWith('//'))
        .filter(({ line }) => line.includes('new Project('))
        // `revised()` and `mergeWith()` are the two sanctioned constructions;
        // both pass `this` as the project to carry from.
        .filter(({ line }) => !line.includes('new Project(mergedData, this)'))
        .filter(
            ({ line }) =>
                !line.includes('new Project({ ...this.data, ...data }'),
        );

    expect(
        bare.length,
        `Project.ts constructs a Project directly at line(s) ${bare
            .map((b) => b.number)
            .join(
                ', ',
            )}. Instance methods must return this.revised({…}) so the ` +
            `analysis of untouched sources carries over; only the static ` +
            `factories may construct one directly.`,
    ).toBe(STATIC_FACTORIES);
});
