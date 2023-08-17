import Names from '@nodes/Names';
import Docs from '@nodes/Docs';
import { localeToLanguage } from './localeToLanguage';
import { toDocString, type NameAndDoc } from './Locale';
import type Locale from './Locale';
import { getLocaleNames } from './getInputLocales';
import { parseLocaleDoc } from '@locale/Locale';
import type Doc from '../nodes/Doc';
import en from '../locale/en-US.json';
import Name from '../nodes/Name';
import Language from '../nodes/Language';

export function getBind(
    locales: Locale[],
    select: (locale: Locale) => NameAndDoc,
    separator = ' '
): string {
    // Get the symbolic names from English (US), which we always include.
    const enNames = locales.some(
        (locale) => locale.language === 'en' && locale.region === 'US'
    )
        ? undefined
        : select(en as Locale).names;
    const symbolic = enNames
        ? Name.make(
              (Array.isArray(enNames) ? enNames : [enNames])[0],
              Language.make('😀')
          )
        : undefined;

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
        new Names([
            ...(symbolic ? [symbolic] : []),
            ...names
                .map(([locale, nameAndDoc]) =>
                    getLocaleNames(nameAndDoc, locale)
                )
                .flat(),
        ]).toWordplay()
    );
}
