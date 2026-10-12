import { getLocaleScript } from '#locale/LocaleText.ts';

/**
 * CLDR names things (emoji, months, eras) per language, and a language's data
 * is in its dominant script: there is no Roman Urdu in CLDR, only Arabic-script
 * Urdu. A locale that names its own script (#1457) therefore takes its *names*
 * from English CLDR and has them translated, keeping only the structure
 * (patterns, calendar) from its language's data.
 */
export function namesNeedTranslation(locale: string): boolean {
    return getLocaleScript(locale) !== undefined;
}

/** Translates English names into the locale; `null` where one failed. */
export type NameTranslator = (
    names: string[],
) => Promise<(string | null)[] | undefined>;

/**
 * Translate a list of English names, reusing what an earlier run produced.
 *
 * A previous value that differs from its English is a translation and is kept,
 * so a re-run buys only what is new, and a run with no translator at all (a
 * standalone `npm run datetimes`) keeps every name it has rather than
 * regenerating them in the wrong script. One still equal to its English is
 * translated again: that is also what an untranslated name looks like. `limit`
 * caps how many are bought, so a run can be sampled before it is paid for in
 * full; the rest stay English and are picked up by the next run.
 */
export async function translateNames(
    english: string[],
    previous: (string | undefined)[],
    translate: NameTranslator | undefined,
    limit = Infinity,
): Promise<string[]> {
    const result = english.map((name, index) => {
        const prior = previous[index];
        return prior !== undefined && prior !== name ? prior : undefined;
    });
    const wanted = Array.from(
        new Set(english.filter((_, index) => result[index] === undefined)),
    ).slice(0, limit);
    const translated = new Map<string, string>();
    if (translate !== undefined && wanted.length > 0) {
        const answers = (await translate(wanted)) ?? [];
        wanted.forEach((name, index) => {
            const answer = answers[index];
            if (typeof answer === 'string' && answer.trim().length > 0)
                translated.set(name, answer.trim());
        });
    }
    return english.map(
        (name, index) => result[index] ?? translated.get(name) ?? name,
    );
}
