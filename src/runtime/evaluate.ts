import { DB } from '../db/Database';
import DefaultLocale from '../locale/DefaultLocale';
import Locales from '../locale/Locales';
import Project from '../models/Project';
import Source from '../nodes/Source';
import type Value from '../values/Value';
import Evaluator from './Evaluator';

/**
 * Evaluates the given program and returns its value.
 * This is primarily used for testing.
 */
export default function evaluateCode(
    main: string,
    supplements?: string[],
    locales?: Locales
): Value | undefined {
    const source = new Source('test', main);
    const project = Project.make(
        null,
        'test',
        source,
        (supplements ?? []).map(
            (code, index) => new Source(`sup${index + 1}`, code)
        ),
        locales?.getLocales() ?? DefaultLocale
    );
    return new Evaluator(
        project,
        DB,
        new Locales(
            locales === undefined ? [DefaultLocale] : locales.getLocales(),
            DefaultLocale
        )
    ).getInitialValue();
}
