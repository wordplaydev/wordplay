import Name from '../nodes/Name';
import SupportedTranslations from './translations';
import Doc from '../nodes/Doc';
import Names from '../nodes/Names';
import Docs from '../nodes/Docs';
import { translationToLanguage } from './translationToLanguage';
import type { NameAndDocTranslation } from './Translation';
import type Translation from './Translation';

export function getInputTranslations(
    select: (translation: Translation) => NameAndDocTranslation[]
): { docs: Docs; names: Names }[] {
    // Make a list of docs and names by bind index.
    const binds: { docs: Doc[]; names: Name[] }[] = [];

    // Convert each translation into names and docs for each input.
    for (const [translation, inputs] of SupportedTranslations.map(
        (translation) => [translation, select(translation)] as const
    )) {
        inputs.forEach((input, index) => {
            if (binds[index] === undefined)
                binds[index] = { docs: [], names: [] };
            binds[index].docs.push(
                new Doc(input.doc, translationToLanguage(translation))
            );
            for (const name of Array.isArray(input.name)
                ? input.name
                : [input.name])
                binds[index].names.push(
                    Name.make(name, translationToLanguage(translation))
                );
        });
    }

    // Convert each inputs doc and mame list into Docs and Names, removing duplicate names.
    return binds.map((bind) => {
        return {
            docs: new Docs(bind.docs),
            names: new Names(
                bind.names.filter(
                    (name) =>
                        !bind.names.some(
                            (name2) => name !== name2 && name.equals(name2)
                        )
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
