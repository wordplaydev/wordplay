import SupportedTranslations from './translations';
import Docs from '../nodes/Docs';
import type { DocTranslation } from './Translation';
import type Translation from './Translation';
import { translationToLanguage } from './translationToLanguage';
import { parseTranslationDoc } from '../parser/Parser';

export function getDocTranslations(
    select: (translation: Translation) => DocTranslation
): Docs {
    return new Docs(
        SupportedTranslations.map((translation) =>
            parseTranslationDoc(select(translation)).withLanguage(
                translationToLanguage(translation)
            )
        )
    );
}
