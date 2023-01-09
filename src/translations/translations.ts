import {
    derived,
    get,
    writable,
    type Readable,
    type Writable,
} from 'svelte/store';
import eng_cs from './eng-cs';
import eng_wordplay from './eng-wp';
import spa_wp from './spa-wp';
import type LanguageCode from './LanguageCode';
import type Translation from './Translation';

/** An app-wide list of preferred languages. */
export const preferredLanguages: Writable<LanguageCode[]> = writable(['eng']);

export type LanguageStyle = 'cs' | 'wp';

export const styleDescriptions: Record<LanguageStyle, string> = {
    wp: 'wordplay',
    cs: 'CS',
};

export function getStyleDescription(style: LanguageStyle) {
    return styleDescriptions[style];
}

/** An app-wide setting of writing style. */
export const preferredStyle: Writable<LanguageStyle> = writable('wp');

/** A list of translations officially supported by Wordplay. */
const SupportedTranslations: Translation[] = [eng_wordplay, eng_cs, spa_wp];

export type MissingTranslation = LanguageCode;

/**
 * A utility for converting preferred languages and style into a list of translations,
 * for components that require a translation. Defaults to eng#wordplay if nothing else
 * is available.
 */
export const preferredTranslations: Readable<Translation[]> = derived(
    [preferredLanguages, preferredStyle],
    () => {
        // Map preferrred languages into translations,
        // filtering out missing translations, and
        // choosing preferred style of translations of the same language.
        const languages = get(preferredLanguages);
        const style = get(preferredStyle);

        const translations: Translation[] = languages
            .map((lang) => {
                const translationsInLanguage = SupportedTranslations.filter(
                    (translation) => translation.language === lang
                );
                const translationInStyle = translationsInLanguage.filter(
                    (trans) => trans.style == style
                );
                return (
                    translationInStyle[0] ??
                    translationsInLanguage[0] ??
                    undefined
                );
            })
            .filter((trans): trans is Translation => trans !== undefined);

        return translations.length === 0 ? [eng_wordplay] : translations;
    }
);

export const missingTranslations: Readable<LanguageCode[]> = derived(
    [preferredLanguages, preferredStyle],
    () => {
        return get(preferredLanguages).filter(
            (lang) =>
                !SupportedTranslations.some((trans) => trans.language === lang)
        );
    }
);

export default SupportedTranslations;
