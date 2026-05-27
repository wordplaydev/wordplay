import { parseLocaleDoc } from '@locale/LocaleText';
import Docs from '@nodes/Docs';
import type Doc from '@nodes/Doc';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import { toDocString, type DocText } from '@locale/LocaleText';
import { localeToLanguage } from '@locale/localeToLanguage';

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
