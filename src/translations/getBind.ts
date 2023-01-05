import type Name from '../nodes/Name';
import SupportedTranslations from './SupportedTranslations';
import Doc from '../nodes/Doc';
import Names from '../nodes/Names';
import Docs from '../nodes/Docs';
import { translationToLanguage } from './translationToLanguage';
import type { NameAndDocTranslation } from './Translation';
import type Translation from './Translation';
import { getInputNames } from './getInputTranslations';

export function getBind(
    select: (translation: Translation) => NameAndDocTranslation,
    separator: string = ' '
): string {
    const inputs = SupportedTranslations.map(
        (translation) => [translation, select(translation)] as const
    );
    return (
        new Docs(
            inputs.map(
                ([translation, input]) =>
                    new Doc(input.doc, translationToLanguage(translation))
            )
        ).toWordplay() +
        separator +
        new Names(
            inputs.reduce(
                (names: Name[], [translation, input]) =>
                    names.concat(getInputNames(input, translation)),
                []
            )
        ).toWordplay()
    );
}
