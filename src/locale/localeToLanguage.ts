import Language from '@nodes/Language';
import type Locale from './Locale';

export function localeToLanguage(locale: Locale) {
    return Language.make(locale.language);
}
