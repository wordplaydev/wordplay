import Docs from '@nodes/Docs';
import { toDocString, type DocText } from './LocaleText';
import type LocaleText from './LocaleText';
import { localeToLanguage } from './localeToLanguage';
import { parseLocaleDoc } from '@locale/LocaleText';
import type Doc from '../nodes/Doc';
import type Locales from './Locales';

export function getDocLocales(
    locales: Locales,
    select: (locale: LocaleText) => DocText,
): Docs {
    return new Docs(
        locales
            .getLocales()
            .map((locale) =>
                parseLocaleDoc(toDocString(select(locale))).withLanguage(
                    localeToLanguage(locale),
                ),
            ) as [Doc, ...Doc[]],
    );
}
