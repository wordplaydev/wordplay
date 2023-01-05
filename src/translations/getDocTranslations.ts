import SupportedTranslations from './SupportedTranslations';
import Doc from '../nodes/Doc';
import Docs from '../nodes/Docs';
import type { DocTranslation } from './Translation';
import type Translation from './Translation';
import { translationToLanguage } from './translationToLanguage';

export function getDocTranslations(
    select: (translation: Translation) => DocTranslation
): Docs {
    return new Docs(
        SupportedTranslations.map(
            (translation) =>
                new Doc(select(translation), translationToLanguage(translation))
        )
    );
}
