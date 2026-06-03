import Name from '@nodes/Name';
import Names from '@nodes/Names';
import { Unwritten } from '@locale/Annotations';
import DefaultLocale from '@locale/DefaultLocale';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import { type NameText } from '@locale/LocaleText';
import { localeToLanguage } from '@locale/localeToLanguage';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import selectTranslation from '@locale/selectTranslation';

export function getNameLocales(
    locales: Locales,
    nameText: NameText | ((locale: LocaleText) => NameText),
): Names {
    // Construct names from the given locales, filtering any placeholders.
    let names = locales
        .getLocales()
        .reduce((names: Name[], locale) => {
            const name =
                nameText instanceof Function
                    ? selectTranslation(locale, nameText)
                    : nameText;
            return names.concat(
                (Array.isArray(name) ? name : [name])
                    .map((n) => {
                        const stripped = withoutAnnotations(n);
                        return stripped === ''
                            ? undefined
                            : Name.make(stripped, localeToLanguage(locale));
                    })
                    .filter((n): n is Name => n !== undefined),
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
