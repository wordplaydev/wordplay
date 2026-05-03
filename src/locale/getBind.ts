import { parseLocaleDoc } from '@locale/LocaleText';
import Docs from '@nodes/Docs';
import Names from '@nodes/Names';
import { getFormattedWordplay } from '@parser/getPreferredSpaces';
import { EMOJI_SYMBOL } from '@parser/Symbols';
import type Doc from '@nodes/Doc';
import Language from '@nodes/Language';
import Name from '@nodes/Name';
import DefaultLocale from '@locale/DefaultLocale';
import { getLocaleNames } from '@locale/getInputLocales';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import { toDocString, type NameAndDoc } from '@locale/LocaleText';
import { localeToLanguage } from '@locale/localeToLanguage';

export function getBind(
    locales: Locales,
    select: (locale: LocaleText) => NameAndDoc,
    separator = ' ',
): string {
    // Get the symbolic names from English (US), which we always include.
    const enNames = locales
        .getLocales()
        .some(
            (locale) =>
                locale.language === 'en' && locale.regions.includes('US'),
        )
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
