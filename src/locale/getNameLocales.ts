import Name from '@nodes/Name';
import Names from '@nodes/Names';
import DefaultLocale from './DefaultLocale';
import type Locales from './Locales';
import type LocaleText from './LocaleText';
import { Unwritten, type NameText } from './LocaleText';
import { localeToLanguage } from './localeToLanguage';

export function getNameLocales(
    locales: Locales,
    nameText: NameText | ((locale: LocaleText) => NameText),
): Names {
    // Construct names from the given locales, filtering any placeholders.
    let names = locales
        .getLocales()
        .reduce((names: Name[], locale) => {
            const name =
                nameText instanceof Function ? nameText(locale) : nameText;
            return names.concat(
                (Array.isArray(name) ? name : [name]).map((n) =>
                    Name.make(n, localeToLanguage(locale)),
                ),
            );
        }, [])
        .filter((name) => name.getName()?.startsWith(Unwritten) === false);
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
