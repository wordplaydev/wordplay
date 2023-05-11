import type LanguageCode from './LanguageCode';
import SupportedLocales from './locales';
import type Locale from './Locale';

/** Given an ordered list of preferred languages, choose the translation that best matches, or the default translation */

export function getPreferredLocale(languages: LanguageCode[]) {
    //
    return (
        languages
            .map((lang) =>
                SupportedLocales.find(
                    (translation) => translation.language === lang
                )
            )
            .filter(
                (translation): translation is Locale =>
                    translation !== undefined
            )[0] ?? SupportedLocales[0]
    );
}
