import Language from '@nodes/Language';
import type LocaleText from '@locale/LocaleText';

export function localeToLanguage(locale: LocaleText) {
    return Language.make(locale.language);
}
