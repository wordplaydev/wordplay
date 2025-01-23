import Names from '@nodes/Names';
import Docs from '@nodes/Docs';
import { localeToLanguage } from './localeToLanguage';
import { toDocString, type NameAndDoc } from './LocaleText';
import type LocaleText from './LocaleText';
import { getLocaleNames } from './getInputLocales';
import { parseLocaleDoc } from '@locale/LocaleText';
import type Doc from '../nodes/Doc';
import Name from '../nodes/Name';
import Language from '../nodes/Language';
import DefaultLocale from './DefaultLocale';
import type Locales from './Locales';
import { getFormattedWordplay } from '@parser/getPreferredSpaces';
import { EMOJI_SYMBOL } from '@parser/Symbols';

export function getBind(
    locales: Locales,
    select: (locale: LocaleText) => NameAndDoc,
    separator = ' ',
): string {
    // Get the symbolic names from English (US), which we always include.
    const enNames = locales
        .getLocales()
        .some((locale) => locale.language === 'en' && locale.region === 'US')
        ? undefined
        : select(DefaultLocale).names;
    const symbolic = enNames
        ? Name.make(
              (Array.isArray(enNames) ? enNames : [enNames])[0],
              Language.make(EMOJI_SYMBOL),
          )
        : undefined;

    const names = locales
        .getLocales()
        .map((locale) => [locale, select(locale)] as const);
    return (
        getFormattedWordplay(
            new Docs(
                names.map(([locale, input]) =>
                    parseLocaleDoc(toDocString(input.doc)).withLanguage(
                        localeToLanguage(locale),
                    ),
                ) as [Doc, ...Doc[]],
            ),
        ) +
        separator +
        getFormattedWordplay(
            new Names([
                ...(symbolic ? [symbolic] : []),
                ...names
                    .map(([locale, nameAndDoc]) =>
                        getLocaleNames(nameAndDoc, locale),
                    )
                    .flat(),
            ]),
        )
    );
}
