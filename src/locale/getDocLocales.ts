import Docs from '@nodes/Docs';
import { toDocString, type DocText } from './Locale';
import type Locale from './Locale';
import { localeToLanguage } from './localeToLanguage';
import { parseLocaleDoc } from '@locale/Locale';
import type Doc from '../nodes/Doc';
import type Locales from './Locales';

export function getDocLocales(
    locales: Locales,
    select: (locale: Locale) => DocText
): Docs {
    return new Docs(
        locales
            .getLocales()
            .map((locale) =>
                parseLocaleDoc(toDocString(select(locale))).withLanguage(
                    localeToLanguage(locale)
                )
            ) as [Doc, ...Doc[]]
    );
}
