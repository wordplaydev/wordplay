import Docs from '@nodes/Docs';
import { toDocString, type DocText } from './Locale';
import type Locale from './Locale';
import { localeToLanguage } from './localeToLanguage';
import { parseLocaleDoc } from '@locale/Locale';
import type Doc from '../nodes/Doc';

export function getDocLocales(
    locales: Locale[],
    select: (locale: Locale) => DocText
): Docs {
    return new Docs(
        locales.map((locale) =>
            parseLocaleDoc(toDocString(select(locale))).withLanguage(
                localeToLanguage(locale)
            )
        ) as [Doc, ...Doc[]]
    );
}
