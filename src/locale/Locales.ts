import type Names from '../nodes/Names';
import type LanguageCode from './LanguageCode';
import type LocaleText from './LocaleText';
import type NodeRef from './NodeRef';
import type ValueRef from './ValueRef';
import type ConceptRef from './ConceptRef';
import { isUnwritten, MachineTranslated } from './LocaleText';
import { getLanguageDirection } from './LanguageCode';
import { localeToString } from './Locale';
import type { Concretizer } from './concretize';
import type Markup from '@nodes/Markup';

export type TemplateInput =
    | number
    | boolean
    | string
    | undefined
    | NodeRef
    | ValueRef
    | ConceptRef;

/** Represents a sequence of preferred locales, and a set of utility functions for extracting information from them. */
export default class Locales {
    /** The function that concretizes. We take this to avoid circular imports, since this class is deeply nested in the Node hierarchy. */
    private readonly concretizer: Concretizer;

    /** The list of preferred locales */
    private readonly locales: LocaleText[];

    /** The fallback locale when none of the preferred locales have suitable strings. */
    private readonly fallback: LocaleText;

    constructor(
        concretizer: Concretizer,
        locales: LocaleText[],
        fallback: LocaleText,
    ) {
        this.concretizer = concretizer;
        this.locales = locales.slice();
        this.fallback = fallback;
    }

    /** Get the first preferred locale */
    getLocale() {
        return this.locales[0] ?? this.fallback;
    }

    /** Get all preferred locales, but with the fallback at the end if not included. */
    getLocales() {
        return [
            ...this.locales,
            ...(this.locales.includes(this.fallback) ? [] : [this.fallback]),
        ];
    }

    getLocaleByString(localeString: string) {
        return this.locales.find(
            (locale) => localeToString(locale) === localeString,
        );
    }

    /** Get preferred locales, in order of preference */
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

    hasLanguage(lang: LanguageCode) {
        return this.getLanguages().includes(lang);
    }

    /**
     * Get the most preferred non-placeholder string given the accessor.
     * If we resort the fallback, annotate the text with a signal that it's a placeholder.
     * */
    get<Kind>(accessor: (locale: LocaleText) => Kind): Kind {
        let fallback = false;
        let match = this.locales
            .map((l) => accessor(l))
            .find((text) => {
                // Placeholder string? Don't choose this one.
                if (typeof text === 'string') return !isUnwritten(text);
                // Array of strings that starts with a placeholder string?
                else if (
                    Array.isArray(text) &&
                    typeof text[0] === 'string' &&
                    !isUnwritten(text[0])
                )
                    return true;
                // Object of strings by key? See if any of the values have placeholders
                else if (text !== null && typeof text === 'object')
                    return !Object.values(text).some(
                        (t) => typeof t === 'string' && isUnwritten(t),
                    );
                // Otherwise, just choose it
                else return true;
            });

        // If we found a preferred result, return it. Strip the automation marker if present.
        if (match === undefined) {
            fallback = true;
            match = accessor(this.fallback);
        }

        return (
            typeof match === 'string'
                ? this.clean(match, fallback)
                : Array.isArray(match) &&
                    match.every((s) => typeof s === 'string')
                  ? match.map((s) => this.clean(s, fallback))
                  : match
        ) as Kind;
    }

    /** Annotates the text as unwritten or machine translated while also replacing any terminology */
    clean(text: string, unwritten: boolean) {
        return `${unwritten ? '🚧' : ''}${text.replace(MachineTranslated, '')}`;
    }

    /**
     * Takes a localization templae and converts it to a concrete string.
     * The syntax is as follows.
     * To indicate that the string has not yet been written, write an empty string or "$?":
     *
     *      ""
     *      "$?"
     *
     * To refer to an input, use a $, followed by the number of the input desired,
     * starting from 1.
     *
     *      "Hello, my name is $1"
     *
     * To indicate that you want to reuse a common phrase defined in a locale's "terminology" dictionary,
     * use a $ followed by any number of word characters (in regex, /\$\w/). This allows
     * for terminology to be changed globally without search and replace.
     *
     *      "To create a new $program, click here."
     *
     * To conditionally select a string, use ??, followed by an input that is either a boolean or possibly undefined value,
     * and true and false cases
     *
     *      "I received $1 ?? [$1 | nothing]"
     *      "I received $1 ?? [$2 ?? [$1 | $2] | nothinge]"
     *
     * To indicate that you want a literal reserved symbol, use two of them:
     *
     *      "$$"
     *      "[["
     *      "]]"
     *      "||"
     */
    concretize(
        /** The string to localize */
        textOrQuery: string | ((locale: LocaleText) => string),
        /** The inputs to use to concretize */
        ...inputs: TemplateInput[]
    ): Markup {
        const template =
            typeof textOrQuery === 'string'
                ? textOrQuery
                : this.get(textOrQuery);
        return this.concretizer(this, template, ...inputs);
    }

    getTermByID(id: string) {
        const locale = this.getLocale();
        const term = id as keyof LocaleText['term'];
        return Object.hasOwn(locale.term, term) ? locale.term[term] : undefined;
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
