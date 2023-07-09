import type LanguageCode from './LanguageCode';
import SupportedLocales from './locales';

/** Given an ordered list of preferred languages, choose the translation that best matches, or the default translation */
export function getPreferredLocale(languages: LanguageCode[]) {
    //
    return (
        languages
            .map((lang) =>
                SupportedLocales.find((translation) => translation === lang)
            )
            .filter((locale) => locale !== undefined)[0] ?? SupportedLocales[0]
    );
}
