import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';
import { isUnwritten, parseLocaleDoc } from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import Doc from '@nodes/Doc';
import Example from '@nodes/Example';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import Source from '@nodes/Source';
import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

/**
 * The landing page's tour examples, compiled.
 *
 * The locale verifier can't do this one: `docExamples.isNonProgram` treats any
 * example containing `¶` as a meta-example — a doc demonstrating doc syntax,
 * whose prose would tokenize into spurious `UnknownName`s — and skips it. Every
 * tour example contains a `¶doc¶` by design, so all ten fall through that hole.
 * This is the check that fills it, and it is what will catch a machine
 * translation that renamed something into a program that no longer runs.
 *
 * Analyzing is not enough on its own: a program can be conflict-free and still
 * put nothing on stage. `Showcase.svelte` renders these through OutputPreview,
 * so what matters is that they evaluate without an exception too — but that
 * needs an Evaluator, and a stage's content depends on things Node doesn't have
 * (Contour's outlines need the browser's font loading). So this checks what is
 * environment-independent: every example parses to exactly one program, and that
 * program analyzes without conflicts, in every locale that has written it.
 */

const TourKeys = [
    'phrase',
    'music',
    'hello',
    'keys',
    'choose',
    'letters',
    'pile',
    'listen',
    'smile',
] as const;

function localeFiles(): { name: string; locale: LocaleText }[] {
    const locales: { name: string; locale: LocaleText }[] = [
        { name: 'en-US', locale: DefaultLocale },
    ];
    const dir = path.join('static', 'locales');
    for (const name of fs.readdirSync(dir)) {
        if (name === 'en-US') continue;
        const file = path.join(dir, name, `${name}.json`);
        if (!fs.existsSync(file)) continue;
        locales.push({
            name,
            locale: JSON.parse(fs.readFileSync(file, 'utf8')) as LocaleText,
        });
    }
    return locales;
}

describe.each(localeFiles())('$name tour examples', ({ locale }) => {
    test.each(TourKeys)('%s compiles', (key) => {
        const tour = locale.ui?.page?.landing?.tour;
        // A locale that hasn't been translated yet has no tour at all, and one
        // mid-translation has "$?" placeholders. Both fall back to en-US at
        // runtime, and neither is this test's business.
        const raw = tour?.example?.[key];
        if (typeof raw !== 'string' || isUnwritten(raw)) return;

        const markup = parseLocaleDoc(withoutAnnotations(raw)).markup;
        const examples = markup
            .nodes()
            .filter((node): node is Example => node instanceof Example);
        expect(
            examples,
            `${key} should hold exactly one \\…\\ example`,
        ).toHaveLength(1);

        const program = examples[0].program;
        expect(
            program.nodes().some((node) => node instanceof Doc),
            `${key} should explain itself in a ¶doc¶`,
        ).toBe(true);

        const project = Project.make(
            null,
            'tour',
            new Source('start', [
                program,
                markup.spaces ?? getPreferredSpaces(program),
            ]),
            [],
            locale,
        );
        const conflicts = Array.from(project.analyze().conflictedNodes.values())
            .flat()
            .map((conflict) => conflict.constructor.name);
        expect(conflicts, `${key} has conflicts`).toEqual([]);
    });
});
