/**
 * How much a screen reader is told about the caret and about each edit.
 *
 * - `terse`: where the caret is, and nothing else.
 * - `normal`: the position, plus a delimiter's match, the count of conflicts
 *   at the caret, and what each discrete edit did.
 * - `verbose`: everything above, plus the construct the caret's node sits in
 *   and the type of what an edit produced.
 *
 * The describers take the tier rather than the Announcer trimming parts of a
 * finished sentence: the clauses that `terse` drops are the expensive ones
 * (type simplification, parent lookup, conflicts), so a terse reader also pays
 * less per keystroke. A leaf module so settings and `src/edit` can both import it.
 */
export const Verbosities = ['terse', 'normal', 'verbose'] as const;

export type Verbosity = (typeof Verbosities)[number];

export function isVerbosity(value: unknown): value is Verbosity {
    return (
        typeof value === 'string' &&
        Verbosities.some((verbosity) => verbosity === value)
    );
}

/** Whether `tier` includes content whose minimum tier is `minimum`. */
export function admits(tier: Verbosity, minimum: Verbosity): boolean {
    return Verbosities.indexOf(tier) >= Verbosities.indexOf(minimum);
}
