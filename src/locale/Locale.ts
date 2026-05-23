import type LanguageCode from '@locale/LanguageCode';
import {
    getLocaleLanguages,
    getLocaleRegions,
} from '@locale/LocaleText';
import type { RegionCode } from '@locale/Regions';

export type Locale = {
    /** An ISO 639-1 language code. For multilingual locales this is the
     *  *primary* (first-listed) language. */
    language: LanguageCode;
    /** An ISO 3166-2 region code: https://en.wikipedia.org/wiki/ISO_3166-2 */
    regions: RegionCode[];
    /** Set when this Locale represents a multilingual combination such as
     *  `es_en` (Spanglish). The array lists every language code in tag
     *  order; the first entry equals `language` above. Monolingual locales
     *  leave this undefined. */
    multilingual?: LanguageCode[];
};

export function localeToString(locale: Locale) {
    const languages = locale.multilingual ?? [locale.language];
    return `${languages.join('_')}${locale.regions.map((r) => `-${r}`).join('')}`;
}

export function stringToLocale(localeString: string): Locale | undefined {
    const languages = getLocaleLanguages(localeString);
    if (languages.length === 0) return undefined;
    const regions = getLocaleRegions(localeString);
    const language = languages[0];
    return languages.length > 1
        ? { language, regions, multilingual: languages }
        : { language, regions };
}

export function localesAreEqual(locale1: Locale, locale2: Locale): boolean {
    const langs1 = locale1.multilingual ?? [locale1.language];
    const langs2 = locale2.multilingual ?? [locale2.language];
    if (langs1.length !== langs2.length) return false;
    for (let i = 0; i < langs1.length; i++)
        if (langs1[i] !== langs2[i]) return false;
    return (
        locale1.regions.length === locale2.regions.length &&
        locale1.regions.every(
            (region, index) => region === locale2.regions[index],
        )
    );
}

export type { Locale as default };
