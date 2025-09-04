import { getLocaleLanguage } from './LocaleText';
import { SupportedLocales, type SupportedLocale } from './SupportedLocales';

/** Find the best supported locales from the requested raw language codes */

export function getBestSupportedLocales(locales: string[]) {
    // Map each locale into the best match.
    const matches = locales
        .map((preferredLocale) => {
            // Is there an exact match?
            const exact = SupportedLocales.find(
                (locale) => preferredLocale === locale,
            );
            if (exact) return exact;
            // Does a language match, even if locale doesn't match?
            const languageExact = SupportedLocales.find(
                (locale) =>
                    getLocaleLanguage(preferredLocale) ===
                    getLocaleLanguage(locale),
            );
            if (languageExact) return languageExact;
            // No match
            return undefined;
        })
        .filter((locale): locale is SupportedLocale => locale !== undefined);

    return matches.length > 0
        ? Array.from(new Set(matches))
        : [SupportedLocales[0]];
}
