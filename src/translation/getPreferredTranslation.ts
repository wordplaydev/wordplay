import type LanguageCode from './LanguageCode';
import SupportedTranslations from './translations';
import type Translation from './Translation';

/** Given an ordered list of preferred languages, choose the translation that best matches, or the default translation */

export function getPreferredTranslation(languages: LanguageCode[]) {
    //
    return (
        languages
            .map((lang) =>
                SupportedTranslations.find(
                    (translation) => translation.language === lang
                )
            )
            .filter(
                (translation): translation is Translation =>
                    translation !== undefined
            )[0] ?? SupportedTranslations[0]
    );
}
