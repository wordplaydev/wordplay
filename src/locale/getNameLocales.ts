import Name from '@nodes/Name';
import Names from '@nodes/Names';
import type { NameText } from './Locale';
import type Locale from './Locale';
import { localeToLanguage } from './localeToLanguage';
import DefaultLocale from './DefaultLocale';
import type Locales from './Locales';

export function getNameLocales(
    locales: Locales,
    nameText: NameText | ((locale: Locale) => NameText)
): Names {
    // Construct names from the given locales, filtering any placeholders.
    let names = locales
        .getLocales()
        .reduce((names: Name[], locale) => {
            const name =
                nameText instanceof Function ? nameText(locale) : nameText;
            return names.concat(
                (Array.isArray(name) ? name : [name]).map((n) =>
                    Name.make(n, localeToLanguage(locale))
                )
            );
        }, [])
        .filter((name) => name.getName()?.startsWith('$?') === false);
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
