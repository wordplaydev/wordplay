import { parseLocaleDoc } from '#locale/LocaleText.ts';
import Docs from '#nodes/Docs.ts';
import Names from '#nodes/Names.ts';
import { getFormattedWordplay } from '#parser/getPreferredSpaces.ts';
import { EMOJI_SYMBOL } from '#parser/Symbols.ts';
import Language from '#nodes/Language.ts';
import Name from '#nodes/Name.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import { getLocaleNames } from '#locale/getInputLocales.ts';
import type Locales from '#locale/Locales.ts';
import type LocaleText from '#locale/LocaleText.ts';
import { toDocString, type NameAndDoc } from '#locale/LocaleText.ts';
import { localeToLanguage } from '#locale/localeToLanguage.ts';
import selectTranslation from '#locale/selectTranslation.ts';

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
        .map((locale) => [locale, selectTranslation(locale, select)] as const);
    return (
        getFormattedWordplay(
            new Docs(
                names.map(([locale, input]) =>
                    parseLocaleDoc(toDocString(input.doc)).withLanguage(
                        localeToLanguage(locale),
                    ),
                ),
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
