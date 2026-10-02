import Name from '#nodes/Name.ts';
import Names from '#nodes/Names.ts';
import { Unwritten } from '#locale/Annotations.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import type Locales from '#locale/Locales.ts';
import type LocaleText from '#locale/LocaleText.ts';
import { type NameText } from '#locale/LocaleText.ts';
import { localeToLanguage } from '#locale/localeToLanguage.ts';
import { withoutAnnotations } from '#locale/withoutAnnotations.ts';
import selectTranslation from '#locale/selectTranslation.ts';

export function getNameLocales(
    locales: Locales,
    nameText: NameText | ((locale: LocaleText) => NameText),
): Names {
    // Construct names from the given locales, filtering any placeholders.
    let names = locales.getLocales().reduce((names: Name[], locale) => {
        const name =
            nameText instanceof Function
                ? selectTranslation(locale, nameText)
                : nameText;
        return names.concat(
            (Array.isArray(name) ? name : [name])
                // Before stripping, not after: an unwritten name carries the
                // English it is waiting to replace, and `withoutAnnotations`
                // would leave that behind as a real name — binding en-US's
                // word in a locale that has not chosen one.
                .filter((n) => !n.startsWith(Unwritten))
                .map((n) => {
                    const stripped = withoutAnnotations(n);
                    return stripped === ''
                        ? undefined
                        : Name.make(stripped, localeToLanguage(locale));
                })
                .filter((n): n is Name => n !== undefined),
        );
    }, []);
    // If the given locales don't include the default locale, include the symbolic name from the default locale first.
    if (
        nameText instanceof Function &&
        locales.getLocales().find((locale) => locale === DefaultLocale) ===
            undefined
    ) {
        const defaultNameTexts = nameText(DefaultLocale);
        const symbolic = (
            Array.isArray(defaultNameTexts)
                ? defaultNameTexts
                : [defaultNameTexts]
        )
            .map((n) => Name.make(n, localeToLanguage(DefaultLocale)))
            .find((name) => name.isSymbolic());
        if (symbolic) names = [symbolic, ...names];
    }
    return new Names(names);
}

/**
 * The single name a basis source should write to refer to another basis
 * definition: the primary locale's first word, so a declared type or supertype
 * reads in the project's language rather than en-US's. Drawn from the same
 * names the definition binds, so it always resolves.
 */
export function getTypeName(
    locales: Locales,
    nameText: (locale: LocaleText) => NameText,
): string {
    return locales.getName(getNameLocales(locales, nameText), false);
}
