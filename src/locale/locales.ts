import {
    derived,
    get,
    writable,
    type Readable,
    type Writable,
} from 'svelte/store';
import eng from './locales/en';
import spa from './locales/es';
import type LanguageCode from './LanguageCode';
import type Locale from './Locale';
import type { WritingDirection, WritingLayout } from './LanguageCode';
import { getPersistedValue, setPersistedValue } from '@db/persist';

/** Global list of preferred languages. */
const LANGUAGES_KEY = 'languages';
export const preferredLanguages: Writable<LanguageCode[]> = writable(
    getPersistedValue<string[]>(LANGUAGES_KEY) ?? ['en']
);

/** Persist preferred languages whenever changed */
preferredLanguages.subscribe((languages) =>
    setPersistedValue(LANGUAGES_KEY, languages)
);

/** A global setting for writing layout */

/** A global setting for writing direction */
const WRITING_LAYOUT_KEY = 'writing-layout';
const WRITING_DIRECTION_KEY = 'writing-direction';
export const writingLayout: Writable<WritingLayout> = writable(
    getPersistedValue(WRITING_LAYOUT_KEY) ?? 'horizontal-tb'
);
export const writingDirection: Writable<WritingDirection> = writable(
    getPersistedValue(WRITING_DIRECTION_KEY) ?? 'ltr'
);

writingLayout.subscribe((layout) =>
    setPersistedValue(WRITING_LAYOUT_KEY, layout)
);
writingDirection.subscribe((direction) =>
    setPersistedValue(WRITING_DIRECTION_KEY, direction)
);

/** A list of translations officially supported by Wordplay. */
const SupportedLocales: Locale[] = [eng, spa];

export type MissingLocale = LanguageCode;

/**
 * A utility for converting preferred languages and style into a list of translations,
 * for components that require a translation. Defaults to eng#wordplay if nothing else
 * is available.
 */
export const preferredLocales: Readable<Locale[]> = derived(
    [preferredLanguages],
    () => {
        // Map preferred languages into translations, filtering out missing translations.
        const languages = get(preferredLanguages);

        const translations: Locale[] = languages
            .map((lang) => {
                const translationsInLanguage = SupportedLocales.filter(
                    (translation) => translation.language === lang
                );
                return translationsInLanguage[0] ?? undefined;
            })
            .filter((trans): trans is Locale => trans !== undefined);

        return translations.length === 0 ? [eng] : translations;
    }
);

export const preferredLocale = derived(
    preferredLocales,
    ($preferredLocales) => $preferredLocales[0]
);

export const missingLocales: Readable<LanguageCode[]> = derived(
    [preferredLanguages],
    () => {
        return get(preferredLanguages).filter(
            (lang) => !SupportedLocales.some((trans) => trans.language === lang)
        );
    }
);

export function getLocale() {
    return get(preferredLocales)[0];
}

export function getLanguages() {
    return get(preferredLocales).map((t) => t.language);
}
export default SupportedLocales;
