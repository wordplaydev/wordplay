import type LanguageCode from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import type Language from '@nodes/Language';
import Node from '@nodes/Node';

export abstract class LanguageTagged extends Node {
    readonly language?: Language | undefined;

    constructor(language?: Language) {
        super();
        this.language = language;
    }

    /** The primary (first) language code on this tag, if any. */
    getLanguage(): LanguageCode | undefined {
        const locale =
            this.language === undefined
                ? undefined
                : this.language.getLanguageText();
        return locale ? (locale.split('-')[0] as LanguageCode) : undefined;
    }

    /** Every language code on this tag in source order. For monolingual tags
     *  this is a one-element array; for multilingual tags (e.g. `/es_en`) it
     *  contains every language. Empty for an untagged value. Used by callers
     *  that need to treat a multilingual tag as a member of MULTIPLE language
     *  buckets — e.g. RootView's per-language editor filter. */
    getLanguages(): LanguageCode[] {
        return this.language ? (this.language.getLanguageCodes() as LanguageCode[]) : [];
    }
}

export function getPreferred<Kind extends LanguageTagged>(
    locales: (Locale | Locale)[],
    texts: Kind[],
): Kind {
    // Selection precedence (most-specific match wins):
    // 1. Monolingual exact-locale match: a tag with exactly one language code,
    //    equal to the locale's language, and (if region-tagged) matching region.
    // 2. Monolingual language-only match: tag has exactly one language code
    //    equal to the locale's language; region differs or is absent.
    // 3. Multilingual exact-locale match: a multilingual tag contains the
    //    locale's language and (if region-tagged) matches the region.
    // 4. Multilingual language-only match: multilingual tag contains the
    //    locale's language, region differs or is absent.
    // 5. Source order: first translation in the list.
    //
    // This keeps monolingual users (e.g. `es`) on monolingual content
    // (`"Hola"/es`) when available, only falling through to multilingual
    // translations (`"Hola gentleman"/es_en`) when no monolingual match
    // exists. Bilingual users still end up on multilingual translations
    // because no monolingual tag will satisfy step 1 or 2 for both of their
    // preferred locales.
    const isMonolingual = (text: Kind) =>
        text.language !== undefined &&
        text.language.getLanguageTokens().length === 1;

    for (const locale of locales) {
        for (const text of texts)
            if (isMonolingual(text) && text.language?.isLocale(locale))
                return text;
        for (const text of texts)
            if (isMonolingual(text) && text.language?.isLocaleLanguage(locale))
                return text;
        for (const text of texts)
            if (!isMonolingual(text) && text.language?.isLocale(locale))
                return text;
        for (const text of texts)
            if (!isMonolingual(text) && text.language?.isLocaleLanguage(locale))
                return text;
    }

    // Default to first.
    return texts[0];
}
