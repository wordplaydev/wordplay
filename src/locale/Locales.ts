import type Names from '../nodes/Names';
import { getLanguageDirection } from './LanguageCode';
import type Locale from './Locale';

/** Represents a sequence of preferred locales, and a set of utility functions for extracting information from them. */
export default class Locales {
    /** The list of preferred locales */
    private readonly locales: Locale[];

    /** The fallback locale when none of the preferred locales have suitable strings. */
    private readonly fallback: Locale;

    constructor(locales: Locale[], fallback: Locale) {
        this.locales = locales.slice();
        this.fallback = fallback;
    }

    /** Get the first preferred locale */
    getLocale() {
        return this.locales[0] ?? this.fallback;
    }

    /** Get all preferred locales */
    getLocales() {
        return [
            ...this.locales.filter((l) => l !== this.fallback),
            this.fallback,
        ];
    }

    getPreferredLocales() {
        return [...this.locales];
    }

    /** Get the language codes for the preferred locales */
    getLanguages() {
        return this.locales.map((locale) => locale.language);
    }

    /** Get the writing direction for the most preferred locale. */
    getDirection() {
        return getLanguageDirection(this.getLocale().language);
    }

    /**
     * Get the most preferred non-placeholder string given the accessor.
     * If we resort the fallback, annotate the text with a signal that it's a placeholder.
     * */
    get<Kind>(accessor: (locale: Locale) => Kind): Kind {
        const preferredResult = this.locales
            .map((l) => accessor(l))
            .find((text) => {
                // Placeholder string? Don't choose this one.
                if (typeof text === 'string') return !text.startsWith('$?');
                // Array of strings that starts with a placeholder string?
                else if (
                    Array.isArray(text) &&
                    typeof text[0] === 'string' &&
                    !text[0].startsWith('$?')
                )
                    return true;
                // Object of strings by key? See if any of the values have placeholders
                else if (text !== null && typeof text === 'object')
                    return !Object.values(text).some(
                        (t) => typeof t === 'string' && t.startsWith('$?')
                    );
                // Otherwise, just choose it
                else return true;
            });
        // If we found a preferred result, return it.
        if (preferredResult) return preferredResult;

        const fallbackResult = accessor(this.fallback);

        // Are we getting a string? Prepend a construction symbol.
        return (
            typeof fallbackResult === 'string'
                ? `🚧${fallbackResult}🚧`
                : // Is it a list of strings? Prepend a construction symbol to the first string.
                Array.isArray(fallbackResult) &&
                  typeof fallbackResult[0] === 'string'
                ? [`🚧${fallbackResult[0]}`, ...fallbackResult.slice(1)]
                : fallbackResult
        ) as Kind;
    }

    getName(names: Names, symbolic = true) {
        return names.getPreferredNameString(this.locales, symbolic);
    }

    isEqualTo(locales: Locales) {
        const thisLocales = this.getLocales();
        const thatLocales = locales.getLocales();
        return (
            thisLocales.length === thatLocales.length &&
            thisLocales.every((l, index) => l === thatLocales[index])
        );
    }
}
