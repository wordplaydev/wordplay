import type LanguageCode from '#locale/LanguageCode.ts';
import {
    getLocaleLanguages,
    getLocaleRegions,
    getLocaleScript,
    toLocaleString,
} from '#locale/LocaleText.ts';
import type { RegionCode } from '#locale/Regions.ts';
import type { Script } from '#locale/Scripts.ts';
import { isNonEmpty } from '#util/nullable.ts';

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
    /** An ISO 15924 script code, set only when the locale is written in a
     *  script other than its language's dominant one (Roman Urdu is `ur` in
     *  `Latn`, #1457). Without it, a locale's script is its language's. */
    script?: Script;
};

/** Wordplay's name for a locale: languages joined with `_`, then the script
 *  subtag if any, then every region, each after a `-` (`ur-Latn-PK`). */
export function localeToString(locale: Locale) {
    return toLocaleString(locale);
}

/** A valid BCP 47 tag for an HTML `lang` attribute or a speech utterance: the
 *  primary language, script and first region only, since `lang` allows neither
 *  the multilingual `_` join nor several regions (`ta-IN-LK-SG` → `ta-IN`). */
export function toBCP47(locale: Locale): string {
    const region = locale.regions[0];
    return `${locale.language}${locale.script ? `-${locale.script}` : ''}${region === undefined ? '' : `-${region}`}`;
}

export function stringToLocale(localeString: string): Locale | undefined {
    const languages = getLocaleLanguages(localeString);
    if (!isNonEmpty(languages)) return undefined;
    const regions = getLocaleRegions(localeString);
    const script = getLocaleScript(localeString);
    const language = languages[0];
    return {
        language,
        regions,
        ...(languages.length > 1 ? { multilingual: languages } : {}),
        ...(script ? { script } : {}),
    };
}

export function localesAreEqual(locale1: Locale, locale2: Locale): boolean {
    const langs1 = locale1.multilingual ?? [locale1.language];
    const langs2 = locale2.multilingual ?? [locale2.language];
    if (langs1.length !== langs2.length) return false;
    for (let i = 0; i < langs1.length; i++)
        if (langs1[i] !== langs2[i]) return false;
    return (
        locale1.script === locale2.script &&
        locale1.regions.length === locale2.regions.length &&
        locale1.regions.every(
            (region, index) => region === locale2.regions[index],
        )
    );
}

export type { Locale as default };
