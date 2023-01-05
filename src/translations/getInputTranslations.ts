import Name from '../nodes/Name';
import SupportedTranslations from './SupportedTranslations';
import Doc from '../nodes/Doc';
import Names from '../nodes/Names';
import Docs from '../nodes/Docs';
import { translationToLanguage } from './translationToLanguage';
import type { NameAndDocTranslation } from './Translation';
import type Translation from './Translation';

export function getInputTranslations(
    select: (translation: Translation) => NameAndDocTranslation[]
): { docs: Docs; names: Names }[] {
    return SupportedTranslations.map((translation) => {
        return { translation, input: select(translation) };
    }).map(({ translation, input }) => {
        return {
            docs: new Docs(
                input.map(
                    (i) => new Doc(i.doc, translationToLanguage(translation))
                )
            ),
            names: new Names(
                // Convert the input and it's name or names into a Name[] using the current translation's langage tag.
                input.reduce(
                    (list: Name[], i) =>
                        list.concat(getInputNames(i, translation)),
                    []
                )
            ),
        };
    });
}

export function getInputNames(
    nameAndDoc: NameAndDocTranslation,
    translation: Translation
) {
    return (
        Array.isArray(nameAndDoc.name) ? nameAndDoc.name : [nameAndDoc.name]
    ).map((name) => Name.make(name, translationToLanguage(translation)));
}
