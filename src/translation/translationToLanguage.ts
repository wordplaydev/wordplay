import Language from '@nodes/Language';
import type Locale from './Locale';

export function translationToLanguage(translation: Locale) {
    return Language.make(translation.language);
}
