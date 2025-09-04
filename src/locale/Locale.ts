import type LanguageCode from './LanguageCode';
import { getLocaleLanguage, getLocaleRegions } from './LocaleText';
import type { RegionCode } from './Regions';

export type Locale = {
    /** An ISO 639-1 language code */
    language: LanguageCode;
    /** An ISO 3166-2 region code: https://en.wikipedia.org/wiki/ISO_3166-2 */
    regions: RegionCode[];
};

export function localeToString(locale: Locale) {
    return `${locale.language}${locale.regions.map((r) => `-${r}`).join('')}`;
}

export function stringToLocale(localeString: string): Locale | undefined {
    const language = getLocaleLanguage(localeString);
    const regions = getLocaleRegions(localeString);
    return language ? { language, regions } : undefined;
}

export type { Locale as default };
