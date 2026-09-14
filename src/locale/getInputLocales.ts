import { parseLocaleDoc } from '@locale/LocaleText';
import type Doc from '@nodes/Doc';
import Docs from '@nodes/Docs';
import Name from '@nodes/Name';
import Names from '@nodes/Names';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import { toDocString, type NameAndDoc } from '@locale/LocaleText';
import { localeToLanguage } from '@locale/localeToLanguage';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import selectTranslation from '@locale/selectTranslation';
import { must } from '@util/nullable';

export function getInputLocales(
    locales: Locales,
    select: (translation: LocaleText) => NameAndDoc[],
): { docs: Docs; names: Names }[] {
    // Make a list of docs and names by bind index.
    const binds: { docs: Doc[]; names: Name[] }[] = [];

    // Convert each translation into names and docs for each input.
    for (const [translation, inputs] of locales
        .getLocales()
        .map(
            (locale) => [locale, selectTranslation(locale, select)] as const,
        )) {
        inputs.forEach((input, index) => {
            if (binds[index] === undefined)
                binds[index] = { docs: [], names: [] };
            binds[index].docs.push(
                parseLocaleDoc(toDocString(input.doc)).withLanguage(
                    localeToLanguage(translation),
                ),
            );
            for (const name of Array.isArray(input.names)
                ? input.names
                : [input.names])
                binds[index].names.push(
                    Name.make(name, localeToLanguage(translation)),
                );
        });
    }

    // Convert each inputs doc and mame list into Docs and Names, removing duplicate names.
    return binds.map((bind) => {
        const [firstDoc, ...restDocs] = bind.docs;
        return {
            // A bind entry is created only by pushing its first doc, so it has one.
            docs: new Docs([must(firstDoc, 'an input doc'), ...restDocs]),
            names: new Names(
                bind.names.filter(
                    (name) =>
                        !bind.names.some(
                            (name2) => name !== name2 && name.isEqualTo(name2),
                        ),
                ),
            ),
        };
    });
}

export function getLocaleNames(nameAndDoc: NameAndDoc, locale: LocaleText) {
    return (
        Array.isArray(nameAndDoc.names) ? nameAndDoc.names : [nameAndDoc.names]
    )
        .map((name) => {
            const stripped = withoutAnnotations(name);
            if (stripped === '') return undefined;
            return Name.make(stripped, localeToLanguage(locale));
        })
        .filter((name): name is Name => name !== undefined);
}
