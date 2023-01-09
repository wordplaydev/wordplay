import Name from '../nodes/Name';
import SupportedTranslations from './translations';
import Names from '../nodes/Names';
import type { NameTranslation } from './Translation';
import type Translation from './Translation';
import { translationToLanguage } from './translationToLanguage';

export function getNameTranslations(
    select: (translation: Translation) => NameTranslation
): Names {
    return new Names(
        SupportedTranslations.reduce((names: Name[], translation) => {
            const name = select(translation);
            return names.concat(
                (Array.isArray(name) ? name : [name]).map((n) =>
                    Name.make(n, translationToLanguage(translation))
                )
            );
        }, [])
    );
}
