import { DB } from '../db/Database';
import DefaultLocale from '../locale/DefaultLocale';
import type Locale from '../locale/Locale';
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
    locale?: Locale | Locale[]
): Value | undefined {
    const source = new Source('test', main);
    const project = new Project(
        null,
        'test',
        source,
        (supplements ?? []).map(
            (code, index) => new Source(`sup${index + 1}`, code)
        ),
        locale ?? DefaultLocale
    );
    return new Evaluator(
        project,
        DB,
        locale === undefined
            ? [DefaultLocale]
            : Array.isArray(locale)
            ? locale
            : [locale]
    ).getInitialValue();
}
