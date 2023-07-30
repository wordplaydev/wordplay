import type Name from '@nodes/Name';
import Names from '@nodes/Names';
import Docs from '@nodes/Docs';
import { localeToLanguage } from './localeToLanguage';
import { toDocString, type NameAndDoc } from './Locale';
import type Locale from './Locale';
import { getLocaleNames } from './getInputLocales';
import { parseLocaleDoc } from '@parser/Parser';
import type Doc from '../nodes/Doc';

export function getBind(
    locales: Locale[],
    select: (locale: Locale) => NameAndDoc,
    separator: string = ' '
): string {
    const names = locales.map((locale) => [locale, select(locale)] as const);
    return (
        new Docs(
            names.map(([locale, input]) =>
                parseLocaleDoc(toDocString(input.doc)).withLanguage(
                    localeToLanguage(locale)
                )
            ) as [Doc, ...Doc[]]
        ).toWordplay() +
        separator +
        new Names(
            names.reduce(
                (names: Name[], [translation, input]) =>
                    names.concat(getLocaleNames(input, translation)),
                []
            )
        ).toWordplay()
    );
}
