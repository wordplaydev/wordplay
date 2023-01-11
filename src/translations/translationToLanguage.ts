import Language from '../nodes/Language';
import type Translation from './Translation';

export function translationToLanguage(translation: Translation) {
    return Language.make(translation.language);
}
