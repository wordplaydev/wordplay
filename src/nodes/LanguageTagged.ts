import type LanguageCode from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import type Language from './Language';
import Node from './Node';

export abstract class LanguageTagged extends Node {
    readonly language?: Language | undefined;

    constructor(language?: Language) {
        super();
        this.language = language;
    }

    getLanguage(): LanguageCode | undefined {
        const locale =
            this.language === undefined
                ? undefined
                : this.language.getLanguageText();
        return locale ? (locale.split('-')[0] as LanguageCode) : undefined;
    }
}

export function getPreferred<Kind extends LanguageTagged>(
    locales: (Locale | Locale)[],
    texts: Kind[],
): Kind {
    // Find the first locale for which there's a matching locale or language.
    for (const locale of locales) {
        for (const text of texts)
            if (text.language?.isLocale(locale)) return text;
        for (const text of texts)
            if (text.language?.isLocaleLanguage(locale)) return text;
    }

    // Default to first.
    return texts[0];
}
