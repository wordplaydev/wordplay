import type Locale from '#locale/Locale.ts';

/**
 * A tag `Intl` will accept, for the times a locale has to be handed to a
 * browser formatter.
 *
 * `localeToString` produces Wordplay's own name for a locale, which is not BCP
 * 47: it joins several languages with `_` and lists every region
 * (`ta-IN-LK-SG`), both of which `Intl` rejects outright. One language, its
 * script, and one region is the most of that a formatter can use.
 *
 * Its own module rather than a function in `Locale.ts` because that file sits
 * on every page's import graph, and the landing page's budget is measured to
 * the kilobyte — see importGraph.test.ts.
 */
export default function localeToBCP47(locale: Locale): string {
    const region = locale.regions[0];
    return `${locale.language}${locale.script ? `-${locale.script}` : ''}${region === undefined ? '' : `-${region}`}`;
}
