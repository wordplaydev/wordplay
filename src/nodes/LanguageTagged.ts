import type Locale from '../locale/Locale';
import type Language from './Language';
import Node from './Node';

export abstract class LanguageTagged extends Node {
    readonly language?: Language;

    constructor(language?: Language) {
        super();
        this.language = language;
    }

    getLanguage() {
        const locale =
            this.language === undefined
                ? undefined
                : this.language.getLanguageText();
        return locale ? locale.split('-')[0] : undefined;
    }
}

export function getPreferred<Kind extends LanguageTagged>(
    locales: Locale[],
    texts: Kind[]
): Kind {
    return (
        texts.find(
            (text) =>
                text.language &&
                locales.some(
                    (locale) =>
                        text.language !== undefined &&
                        text.language.isLocale(locale)
                )
        ) ??
        texts.find(
            (name) =>
                name.language &&
                locales.some(
                    (locale) =>
                        name.language !== undefined &&
                        name.language.isLocaleLanguage(locale)
                )
        ) ??
        // Default to the first name, if there is one.
        texts[0]
    );
}
