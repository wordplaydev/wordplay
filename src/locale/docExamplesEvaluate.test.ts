import { DB } from '#db/Database.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import DefaultLocales from '#locale/DefaultLocales.ts';
import { toDocString } from '#locale/LocaleText.ts';
import Source from '#nodes/Source.ts';
import Evaluator from '#runtime/Evaluator.ts';
import getDocExamples from '#util/verify-locales/docExamples.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import { describe, expect, test } from 'vitest';

/**
 * Every runnable example in the en-US docs must evaluate without an exception.
 *
 * `npm run locales` already holds these examples to "no conflicts" (checkDocContent), but a
 * program can analyze cleanly and still fail at runtime, and nothing ran them: the docs are the
 * widest tour of the basis there is, so evaluating them is cheap coverage of every documented
 * function, stream and output. The skips match checkDocContent's: 🪲 marks a deliberate defect,
 * and a single token is prose formatted as code.
 */

type DocExample = { path: string; code: string };

/** Collect every `doc` field under a locale section, keyed by its dotted path. */
function collectDocs(value: unknown, path: string, docs: [string, string][]) {
    if (path.endsWith('.doc')) {
        if (
            typeof value === 'string' ||
            (Array.isArray(value) &&
                value.every((paragraph) => typeof paragraph === 'string'))
        )
            docs.push([path, toDocString(value)]);
        return;
    }
    if (Array.isArray(value))
        value.forEach((item, index) =>
            collectDocs(item, `${path}.${index}`, docs),
        );
    else if (value !== null && typeof value === 'object')
        for (const [key, child] of Object.entries(value))
            collectDocs(child, `${path}.${key}`, docs);
}

function runnableExamples(section: string, text: unknown): DocExample[] {
    const docs: [string, string][] = [];
    collectDocs(text, section, docs);
    return docs.flatMap(([path, doc]) =>
        getDocExamples(doc)
            .filter((example) => !example.expectsDefect && example.tokens > 1)
            .map((example) => ({ path, code: example.code })),
    );
}

/** Evaluate a program to its initial value, describing any failure. */
function failureOf(code: string): string | undefined {
    try {
        const project = Project.make(
            null,
            'test',
            new Source('start', code),
            [],
            DefaultLocale,
        );
        const evaluator = new Evaluator(
            project,
            DB,
            DefaultLocales.getLocales(),
            false,
        );
        const value = evaluator.getInitialValue();
        evaluator.stop();
        if (value === undefined) return 'evaluated to nothing';
        if (value instanceof ExceptionValue)
            return value.getExplanation(DefaultLocales).toText();
        return undefined;
    } catch (error) {
        return `threw: ${String(error)}`;
    }
}

const Sections = {
    basis: DefaultLocale.basis,
    input: DefaultLocale.input,
    output: DefaultLocale.output,
    node: DefaultLocale.node,
};

test('the check notices an example that fails at runtime', () => {
    // An unbounded recursion analyzes cleanly and only fails when run.
    expect(failureOf('ƒ loop() loop() + 1\nloop()')).toBeDefined();
    expect(failureOf('1 + 1')).toBeUndefined();
});

describe.each(Object.entries(Sections))('%s docs', (section, text) => {
    const examples = runnableExamples(section, text);

    test('have runnable examples', () => {
        expect(examples.length).toBeGreaterThan(50);
    });

    test.each(examples.map(({ path, code }) => [path, code] as const))(
        '%s: %s',
        (_, code) => {
            expect(failureOf(code)).toBeUndefined();
        },
    );
});
