import type LanguageCode from './LanguageCode';
import { getLocaleLanguage, getLocaleRegion } from './LocaleText';
import type { RegionCode } from './Regions';

export type Locale = {
    /** An ISO 639-1 language code */
    language: LanguageCode;
    /** An ISO 3166-2 region code: https://en.wikipedia.org/wiki/ISO_3166-2 */
    region: RegionCode | undefined;
};

export function localeToString(locale: Locale) {
    return `${locale.language}${locale.region ? `-${locale.region}` : ''}`;
}

export function stringToLocale(localeString: string): Locale | undefined {
    const language = getLocaleLanguage(localeString);
    const region = getLocaleRegion(localeString);
    return language ? { language, region } : undefined;
}

export type { Locale as default };
