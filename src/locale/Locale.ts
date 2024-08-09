import type LanguageCode from './LanguageCode';
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

export function stringToLocale(localeString: string): Locale {
    const [language, region] = localeString.split('-');
    return { language: language as LanguageCode, region: region as RegionCode };
}

export type { Locale as default };
