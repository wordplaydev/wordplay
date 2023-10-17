import Name from '@nodes/Name';
import type Doc from '@nodes/Doc';
import Names from '@nodes/Names';
import Docs from '@nodes/Docs';
import { localeToLanguage } from './localeToLanguage';
import { toDocString, type NameAndDoc, nameWithoutMentions } from './Locale';
import type Locale from './Locale';
import { parseLocaleDoc } from '@locale/Locale';
import type Locales from './Locales';

export function getInputLocales(
    locales: Locales,
    select: (translation: Locale) => NameAndDoc[]
): { docs: Docs; names: Names }[] {
    // Make a list of docs and names by bind index.
    const binds: { docs: Doc[]; names: Name[] }[] = [];

    // Convert each translation into names and docs for each input.
    for (const [translation, inputs] of locales
        .getLocales()
        .map((locale) => [locale, select(locale)] as const)) {
        inputs.forEach((input, index) => {
            if (binds[index] === undefined)
                binds[index] = { docs: [], names: [] };
            binds[index].docs.push(
                parseLocaleDoc(toDocString(input.doc)).withLanguage(
                    localeToLanguage(translation)
                )
            );
            for (const name of Array.isArray(input.names)
                ? input.names
                : [input.names])
                binds[index].names.push(
                    Name.make(name, localeToLanguage(translation))
                );
        });
    }

    // Convert each inputs doc and mame list into Docs and Names, removing duplicate names.
    return binds.map((bind) => {
        return {
            docs: new Docs([bind.docs[0], ...bind.docs.slice(1)]),
            names: new Names(
                bind.names.filter(
                    (name) =>
                        !bind.names.some(
                            (name2) => name !== name2 && name.isEqualTo(name2)
                        )
                )
            ),
        };
    });
}

export function getLocaleNames(nameAndDoc: NameAndDoc, locale: Locale) {
    return (
        Array.isArray(nameAndDoc.names) ? nameAndDoc.names : [nameAndDoc.names]
    )
        .map((name) => {
            const stripped = nameWithoutMentions(name);
            if (stripped === '') return undefined;
            return Name.make(stripped, localeToLanguage(locale));
        })
        .filter((name): name is Name => name !== undefined);
}
