import { GoogleTranslateCodeOverrides, TranslatableLocales } from '@locale/LanguageCode';
import type LanguageCode from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import { localeToString } from '@locale/Locale';
import type { RegionCode } from '@locale/Regions';
import type Log from '@util/verify-locales/Log';
import type Translator from './Translator';
import translate, {
    getGoogleTranslateTargetLocale,
    GoogleTranslate,
} from './translate';

/** The code Google Translate expects for a locale, applying the few overrides
 *  (e.g. `nb`→`no`) where Google uses a different code than Wordplay. */
function toGoogleTranslateCode(locale: Locale): string {
    return (
        GoogleTranslateCodeOverrides[locale.language] ?? localeToString(locale)
    );
}

/** The current Google v2 backend, wrapped behind the `Translator` interface. */
export default class GoogleTranslator implements Translator {
    readonly id = 'google';

    translate(
        log: Log,
        text: string[],
        sourceLocale: string,
        targetLocale: string,
    ): Promise<string[] | undefined> {
        return translate(log, text, sourceLocale, targetLocale);
    }

    getTargetLocale(
        language: LanguageCode,
        regions: RegionCode[],
    ): Promise<string> {
        return getGoogleTranslateTargetLocale(language, regions);
    }

    /** The offered locales Google actually supports, per its languages list. */
    async getSupportedLocales(): Promise<Locale[]> {
        const [languages] = await GoogleTranslate.getLanguages();
        const codes = new Set(Array.from(languages).map((l) => l.code));
        return TranslatableLocales.filter(
            (locale) =>
                codes.has(toGoogleTranslateCode(locale)) ||
                codes.has(locale.language),
        );
    }
}
