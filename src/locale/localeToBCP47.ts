import type Locale from '@locale/Locale';

/**
 * A tag `Intl` will accept, for the times a locale has to be handed to a
 * browser formatter.
 *
 * `localeToString` produces Wordplay's own name for a locale, which is not BCP
 * 47: it joins several languages with `_` and lists every region
 * (`ta-IN-LK-SG`), both of which `Intl` rejects outright. One language and one
 * region is the most of that a formatter can use.
 *
 * Its own module rather than a function in `Locale.ts` because that file sits
 * on every page's import graph, and the landing page's budget is measured to
 * the kilobyte — see importGraph.test.ts.
 */
export default function localeToBCP47(locale: Locale): string {
    return locale.regions.length > 0
        ? `${locale.language}-${locale.regions[0]}`
        : locale.language;
}
