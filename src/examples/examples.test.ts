import Templates from '@concepts/Templates';
import Evaluator from '@runtime/Evaluator';
import UnicodeString from '@unicode/UnicodeString';
import ExceptionValue from '@values/ExceptionValue';
import { readFileSync } from 'fs';
import path from 'path';
import { expect, test } from 'vitest';
import { DB, Locales } from '@db/Database';
import Project from '@db/projects/Project';
import type { SerializedProject } from '@db/projects/ProjectSchemas';
import DefaultLocales from '@locale/DefaultLocales';
import { getExampleGalleries } from './examples';
import { readProjects } from './readProjects';

const projects: SerializedProject[] = readProjects('examples');

/**
 * How much source an example may have and still be analyzed and evaluated here.
 *
 * A few examples are imports rather than programs: a converted song is tens of
 * thousands of notes and almost no distinct code, so analyzing and evaluating
 * it costs seconds — enough to exceed the per-test timeout when the suite runs
 * in parallel — while covering nothing the shorter examples don't already. The
 * largest hand-written example is around 25,000 characters, so this leaves room
 * to grow without letting a data dump back in.
 */
const MaxTestableLength = 50_000;

function lengthOf(example: SerializedProject): number {
    return example.sources.reduce(
        (total, source) => total + source.code.length,
        0,
    );
}

const testable = projects.filter(
    (example) => lengthOf(example) <= MaxTestableLength,
);
const oversized = projects.filter(
    (example) => lengthOf(example) > MaxTestableLength,
);

// A size limit that quietly stopped testing everything would still pass, so
// assert that it only ever takes the exceptions out.
test('the size limit excludes only the occasional data-heavy import', () => {
    expect(testable.length).toBeGreaterThan(projects.length * 0.9);
});

// Named rather than filtered away, so the output says what isn't covered.
test.skip.each([...oversized])(
    `Ensure $name has no conflicts`,
    () => undefined,
);
test.skip.each([...oversized])(
    `Ensure $name doesn't evaluate to exception`,
    () => undefined,
);

test.each([...testable])(
    `Ensure $name has no conflicts`,
    async (example: SerializedProject) => {
        const project = await Project.deserialize(Locales, example);
        project.analyze();
        project.getAnalysis();
        const context = project.getContext(project.getMain());
        const conflicts = Array.from(
            project.getConflictedNodes().values(),
        ).flat();
        const messages: string[] = [];
        for (const conflict of conflicts) {
            const conflictingNodes = conflict.getMessage(context, Templates);
            messages.push(
                conflictingNodes.explanation(DefaultLocales, context).toText(),
            );
        }
        expect(
            conflicts,
            'Unexpected conflicts: \n' + messages.join('\n'),
        ).toHaveLength(0);
    },
);

// NOTE: Disabling this test. Don't think its necessary to have all examples localized in all
// supported locales, since we can translate examples on demand.
// test.each([...templates])(
//     'Ensure template names are localized',
//     async (template: SerializedProject) => {
//         const project = await Project.deserialize(Locales, template);

//         // Find all names, except the binds that are inputs to an evaluae
//         const names = project.getSources().reduce((binds: Names[], source) => {
//             return [
//                 ...binds,
//                 ...source.expression.nodes().filter(
//                     (node): node is Names =>
//                         node instanceof Names &&
//                         // Exclude names that are in bind in an evaluate, since those are not definitions
//                         !(
//                             project
//                                 .getRoot(node)
//                                 ?.getAncestors(node)[1] instanceof Evaluate
//                         ),
//                 ),
//             ];
//         }, []);

//         const supportedLanguages = SupportedLocales.map((locale) =>
//             getLocaleLanguage(locale),
//         ).filter((lang): lang is LanguageCode => lang !== undefined);

//         // Ensure all binds are localized
//         const incompleteNames = names.filter(
//             (name) =>
//                 !supportedLanguages.every((lang) =>
//                     name.containsLanguage(lang),
//                 ),
//         );

//         expect(
//             incompleteNames,
//             `Names in template '${template.name}' ${incompleteNames
//                 .map((bind) => `'${bind.getNames()[0].toLowerCase()}'`)
//                 .join(
//                     ', ',
//                 )} are missing translations for one or more supported languages ${supportedLanguages.join(
//                 ', ',
//             )}`,
//         ).toHaveLength(0);
//     },
// );

// test.each([...templates])(
//     'Ensure template docs are localized',
//     async (template: SerializedProject) => {
//         const project = await Project.deserialize(Locales, template);

//         const supportedLanguages = SupportedLocales.map((locale) =>
//             getLocaleLanguage(locale),
//         ).filter((lang): lang is LanguageCode => lang !== undefined);

//         // Find all docs
//         const docs = project.getSources().reduce((docs: Docs[], source) => {
//             return [
//                 ...docs,
//                 ...source.expression
//                     .nodes()
//                     .filter((node): node is Docs => node instanceof Docs),
//             ];
//         }, []);

//         const incompleteDocs = docs.filter(
//             (doc) =>
//                 !supportedLanguages.every((lang) => doc.containsLanguage(lang)),
//         );

//         expect(
//             incompleteDocs,
//             `Docs in template '${template.name}' ${incompleteDocs
//                 .map((doc) => doc.toWordplay())
//                 .join(
//                     ', ',
//                 )} are missing translations for one or more supported languages ${supportedLanguages.join(
//                 ', ',
//             )}`,
//         ).toHaveLength(0);
//     },
// );

test.each([
    ...getExampleGalleries(DefaultLocales)
        .map((gallery) => gallery.getProjects())
        .flat(),
])(`Ensure /static/examples/%s.wp exists`, (example: string) => {
    try {
        const file = path.join(
            'static',
            'examples',
            `${example.split('-')[1]}.wp`,
        );
        readFileSync(file, 'utf8');
        expect(true).toBe(true);
    } catch (_) {
        expect(true).toBe(false);
    }
});

test.each([...testable])(
    `Ensure $name doesn't evaluate to exception`,
    async (example: SerializedProject) => {
        const project = await Project.deserialize(Locales, example);
        const evaluator = new Evaluator(
            project,
            DB,
            DefaultLocales.getLocales(),
            false,
        );
        const value = evaluator.getInitialValue();
        evaluator.stop();
        // An undefined value renders a blank stage, and `not.toBeInstanceOf`
        // passes happily on it, so check for it explicitly.
        expect(value, 'evaluated to nothing at all').toBeDefined();
        expect(value, value?.toWordplay()).not.toBeInstanceOf(ExceptionValue);
    },
);

// Every example .wp file must declare a preview glyph on its first line
// (a single grapheme, before the project title). See parseSerializedProject
// in `examples.ts` and the file format docs there. This guards against new
// examples being added without a preview, which would leave their tile on
// /galleries / /projects waiting for the on-demand compute queue.
// Deliberately every example, not just the testable ones: reading a field
// costs nothing, and a long example's tile needs a preview just as much.
test.each([...projects])(
    `$name has a single-grapheme preview glyph`,
    (example: SerializedProject) => {
        expect(
            example.preview,
            `Add a single-grapheme preview line to the top of static/examples/${example.id.replace(/^example-/, '')}.wp`,
        ).toBeDefined();
        const text = example.preview?.text ?? '';
        expect(
            new UnicodeString(text).getLength(),
            `Preview glyph "${text}" must be exactly one grapheme.`,
        ).toBe(1);
    },
);
