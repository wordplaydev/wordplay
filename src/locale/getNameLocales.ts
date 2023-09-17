import Name from '@nodes/Name';
import Names from '@nodes/Names';
import type { NameText } from './Locale';
import type Locale from './Locale';
import { localeToLanguage } from './localeToLanguage';
import en from '../locale/en-US.json';

export function getNameLocales(
    locales: Locale[],
    nameText: NameText | ((locale: Locale) => NameText)
): Names {
    // Construct names from the given locales.
    let names = locales.reduce((names: Name[], locale) => {
        const name = nameText instanceof Function ? nameText(locale) : nameText;
        return names.concat(
            (Array.isArray(name) ? name : [name]).map((n) =>
                Name.make(n, localeToLanguage(locale))
            )
        );
    }, []);
    // If the given locales don't include, the default locale, include the symbolic name from the default locale first.
    if (
        nameText instanceof Function &&
        locales.find((locale) => locale === en) === undefined
    ) {
        const defaultNameTexts = nameText(en as Locale);
        const symbolic = (
            Array.isArray(defaultNameTexts)
                ? defaultNameTexts
                : [defaultNameTexts]
        )
            .map((n) => Name.make(n, localeToLanguage(en as Locale)))
            .find((name) => name.isSymbolic());
        if (symbolic) names = [symbolic, ...names];
    }
    return new Names(names);
}
