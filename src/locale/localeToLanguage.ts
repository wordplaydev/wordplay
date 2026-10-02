import Language from '#nodes/Language.ts';
import type LocaleText from '#locale/LocaleText.ts';

export function localeToLanguage(locale: LocaleText) {
    return Language.make(locale.language);
}
