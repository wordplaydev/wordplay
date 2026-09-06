import Project from '@db/projects/Project';
import type LocaleText from '@locale/LocaleText';
import { isUnwritten, parseLocaleDoc } from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import Doc from '@nodes/Doc';
import Example from '@nodes/Example';
import Source from '@nodes/Source';
import getPreferredSpaces from '@parser/getPreferredSpaces';

/**
 * The check behind Showcase.test.ts (en-US, in the default suite) and
 * Showcase.locales.test.ts (the other 30, in the `sweep` project), so the two can
 * never drift into asking different questions.
 *
 * Two things about its shape. It is not a `.test.ts`, because importing one test
 * file from another re-registers its suites in the importer — splitting this the
 * obvious way silently ran en-US twice. And it returns problems rather than
 * asserting them, so it needs no `vitest` import: this sits in `src/components`,
 * where a value import of a dev dependency is the kind of edge importGraph.test.ts
 * exists to keep out of the bundle.
 */

/** The nine examples Showcase.svelte offers on the landing page. */
export const TourKeys = [
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

export type TourKey = (typeof TourKeys)[number];

/**
 * What is wrong with one locale's tour example, or nothing. A locale that hasn't
 * been translated yet has no tour at all, and one mid-translation has "$?"
 * placeholders; both fall back to en-US at runtime, and neither is a problem here.
 */
export function tourExampleProblems(
    locale: LocaleText,
    key: TourKey,
): string[] {
    const raw = locale.ui?.page?.landing?.tour?.example?.[key];
    if (typeof raw !== 'string' || isUnwritten(raw)) return [];

    const markup = parseLocaleDoc(withoutAnnotations(raw)).markup;
    const examples = markup
        .nodes()
        .filter((node): node is Example => node instanceof Example);
    if (examples.length !== 1)
        return [
            `${key} should hold exactly one \\…\\ example, but holds ${examples.length}`,
        ];

    const program = examples[0].program;
    const problems: string[] = [];
    if (!program.nodes().some((node) => node instanceof Doc))
        problems.push(`${key} should explain itself in a ¶doc¶`);

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
    for (const conflict of Array.from(
        project.analyze().conflictedNodes.values(),
    ).flat())
        problems.push(`${key} has a ${conflict.constructor.name}`);

    return problems;
}
