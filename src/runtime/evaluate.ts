import { DB } from '#db/Database.ts';
import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Locales from '#locale/Locales.ts';
import Source from '#nodes/Source.ts';
import type Value from '#values/Value.ts';
import Evaluator from '#runtime/Evaluator.ts';

/**
 * Evaluates the given program and returns its value.
 * This is primarily used for testing.
 */
export default function evaluateCode(
    main: string,
    supplements?: string[],
    locales?: Locales,
): Value | undefined {
    const source = new Source('test', main);
    const project = Project.make(
        null,
        'test',
        source,
        (supplements ?? []).map(
            (code, index) => new Source(`sup${index + 1}`, code),
        ),
        locales?.getLocales() ?? DefaultLocale,
    );
    return new Evaluator(
        project,
        DB,
        // The reader's locales without the en-US fallback, as the app evaluates.
        locales === undefined ? [DefaultLocale] : locales.getPreferredLocales(),
    ).getInitialValue();
}
