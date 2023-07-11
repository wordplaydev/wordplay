import type Name from '@nodes/Name';
import Names from '@nodes/Names';
import Docs from '@nodes/Docs';
import { localeToLanguage } from './localeToLanguage';
import { toDocString, type NameAndDoc } from './Locale';
import type Locale from './Locale';
import { getInputNames } from './getInputLocales';
import { parseLocaleDoc } from '@parser/Parser';

export function getBind(
    locales: Locale[],
    select: (translation: Locale) => NameAndDoc,
    separator: string = ' '
): string {
    const inputs = locales.map(
        (translation) => [translation, select(translation)] as const
    );
    return (
        new Docs(
            inputs.map(([locale, input]) =>
                parseLocaleDoc(toDocString(input.doc)).withLanguage(
                    localeToLanguage(locale)
                )
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
