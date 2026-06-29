import type Markup from '@nodes/Markup';
import { MACHINE_TRANSLATED_SYMBOL } from '@parser/Symbols';
import { withMonoEmoji } from '@unicode/emoji';
import type Names from '@nodes/Names';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import { MachineTranslated, Unwritten } from '@locale/Annotations';
import type ConceptRef from '@locale/ConceptRef';
import type { Concretizer } from '@locale/concretize';
import type LanguageCode from '@locale/LanguageCode';
import {
    getLanguageDirection,
    getLanguageLayout,
    getLanguageScripts,
} from '@locale/LanguageCode';
import { localeToString } from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
import { isUnwritten, toLocaleString, type Template } from '@locale/LocaleText';
import type NodeRef from '@locale/NodeRef';
import type { Script, WritingDirection } from '@locale/Scripts';
import type ValueRef from '@locale/ValueRef';
import { withoutAnnotations } from '@locale/withoutAnnotations';

export type TemplateInput =
    | number
    | boolean
    | string
    | undefined
    | NodeRef
    | ValueRef
    | ConceptRef;

/**
 * An accessor function that takes a Locales instance and gets the desired string. Should just be a pure property access defining a path
 * as we use the source code of these to extract the path for inline localization contributions from creators.
 */
export type LocaleTextAccessor = (locale: LocaleText) => string;
export type LocaleTextsAccessor = (locale: LocaleText) => string | string[];

/** A single locale's rendering of some UI text, used to echo each chosen locale.
 *  Carries the language/direction so callers can tag spans for bidi/script/font. */
export type MultilingualEntry = {
    language: LanguageCode;
    direction: WritingDirection;
    text: string;
};

/** Like {@link MultilingualEntry}, but carrying concretized `Markup` for contexts that
 *  render rich text per locale (e.g. tooltips). */
export type MultilingualMarkup = {
    language: LanguageCode;
    direction: WritingDirection;
    markup: Markup;
};

/** Separator placed between locales when several are joined into one plain string for a
 *  NON-VISUAL context — an aria-label or title attribute, which can't carry per-language
 *  markup. Visible text must never use this; it styles each locale instead (see
 *  LocalizedText / MarkupHTMLView / Hint). */
export const MULTILINGUAL_SEPARATOR = ' · ';

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

    getLocaleString() {
        return toLocaleString(this.getLocale());
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

    /** Single-locale views for the non-primary preferred locales, used to echo UI text
     *  in each additional chosen locale. Each view falls back to its own locale so an
     *  unwritten string stays detectable (annotated, see {@link isUnwritten}) instead of
     *  silently resolving to English. Empty when only one locale is chosen, which is what
     *  makes the multilingual UI a no-op for the common single-locale case. */
    getSecondaryLocaleViews(): Locales[] {
        return this.locales
            .slice(1)
            .map((l) => new Locales(this.concretizer, [l], l));
    }

    /** True if one of the locales uses the given script */
    usesScript(script: Script) {
        return this.locales.some((locale) =>
            getLanguageScripts(locale.language).includes(script),
        );
    }

    /** Get the language codes for the preferred locales */
    getLanguages() {
        return this.locales.map((locale) => locale.language);
    }

    /** Get the writing direction for the most preferred locale. */
    getDirection() {
        return getLanguageDirection(this.getLocale().language);
    }

    /** Get the writing layout (horizontal/vertical) for the most preferred locale. */
    getLayout() {
        return getLanguageLayout(this.getLocale().language);
    }

    hasLanguage(lang: LanguageCode) {
        return this.getLanguages().includes(lang);
    }

    /**
     * Get the most preferred non-placeholder string given the accessor.
     * This is private, because everything must do something with the annotations on the strings, either removing them
     * or converting then to plain text, or converting them to a UI.
     * */
    private get<Kind>(accessor: (locale: LocaleText) => Kind): Kind {
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
                // Object of strings by key? See if any of the values have placeholders (other than emotions, which don't count as unwritten).
                else if (text !== null && typeof text === 'object')
                    return !Object.entries(text).some(
                        ([key, t]) =>
                            typeof t === 'string' &&
                            isUnwritten(t) &&
                            key !== 'emotion',
                    );
                // Otherwise, just choose it
                else return true;
            });

        // If we didn't find a match, fall back to the fallback locale.
        if (match === undefined) {
            fallback = true;
            match = accessor(this.fallback);
        }

        // If the thing we got is a nested object, clean all the objects.
        if (typeof match === 'object' && match !== null) {
            const cleaned = JSON.parse(JSON.stringify(match)) as Record<
                any,
                any
            >;
            const pairs = getKeyTemplatePairs(cleaned);
            for (const pair of pairs)
                if (typeof pair.value === 'string')
                    pair.repair(
                        cleaned,
                        this.annotateAsUnwritten(pair.value, fallback),
                    );
            match = cleaned;
        }

        return (
            // Is the match a string? Clean it.
            (
                typeof match === 'string'
                    ? this.annotateAsUnwritten(match, fallback)
                    : // Is it an array? Clean each one.
                      Array.isArray(match) &&
                        match.every((s) => typeof s === 'string')
                      ? match.map((s) => this.annotateAsUnwritten(s, fallback))
                      : match
            ) as Kind
        );
    }

    /** Annotates the text as unwritten or machine translated while also replacing any terminology */
    private annotateAsUnwritten(text: string, unwritten: boolean) {
        return `${unwritten ? Unwritten : ''}${text}`;
    }

    /** This gets the text with the annotations unprocessed. This is a just a pass through to make it explicit. */
    getWithAnnotations<Kind>(accessor: (locale: LocaleText) => Kind): Kind {
        return this.get(accessor);
    }

    /**
     * Resolve the accessor in each chosen locale, returning one entry per locale that
     * has written the string. The primary entry uses the normal full-fallback resolution;
     * each secondary entry comes from a single-locale view and is skipped when unwritten
     * in its own locale or when it duplicates an earlier entry. Text keeps its annotations.
     * With one chosen locale this returns a single entry.
     */
    private getMultilingualRaw(
        accessor: LocaleTextAccessor,
    ): MultilingualEntry[] {
        const result: MultilingualEntry[] = [];
        const seen = new Set<string>();
        const push = (locale: LocaleText, text: string) => {
            const plain = withoutAnnotations(text);
            if (seen.has(plain)) return;
            seen.add(plain);
            result.push({
                language: locale.language,
                direction: getLanguageDirection(locale.language),
                text,
            });
        };

        // Primary is always included so single-locale output is identical to today.
        const primary = this.get(accessor);
        if (typeof primary === 'string') push(this.getLocale(), primary);

        for (const view of this.getSecondaryLocaleViews()) {
            const text = view.getWithAnnotations(accessor);
            if (typeof text !== 'string' || isUnwritten(text)) continue;
            push(view.getLocale(), text);
        }

        return result;
    }

    /**
     * Resolve the accessor in each chosen locale, with annotations stripped. The joined
     * form feeds NON-VISUAL plain-string attributes (aria-label/title); visible text uses
     * the styled components instead.
     */
    getMultilingualEntries(accessor: LocaleTextAccessor): MultilingualEntry[] {
        return this.getMultilingualRaw(accessor).map((entry) => ({
            ...entry,
            text: withoutAnnotations(entry.text),
        }));
    }

    /**
     * Like {@link getMultilingualEntries}, but concretizes each locale's template in that
     * locale (so terminology like `$program` resolves per-locale) and returns the
     * resulting `Markup`. Used for tooltips, which render rich content per chosen locale.
     */
    getMultilingualMarkup(accessor: LocaleTextAccessor): MultilingualMarkup[] {
        const result: MultilingualMarkup[] = [];
        const seen = new Set<string>();
        const push = (locale: Locales, skipUnwritten: boolean) => {
            const template = locale.getWithAnnotations(accessor);
            if (typeof template !== 'string') return;
            if (skipUnwritten && isUnwritten(template)) return;
            const markup = locale.concretize(template);
            const text = markup.toText();
            if (text.length === 0 || seen.has(text)) return;
            seen.add(text);
            const language = locale.getLocale().language;
            result.push({
                language,
                direction: getLanguageDirection(language),
                markup,
            });
        };

        push(this, false);
        for (const view of this.getSecondaryLocaleViews()) push(view, true);

        return result;
    }

    /**
     * Like {@link getMultilingualMarkup}, but for tooltips assembled from a locale
     * subtree (e.g. a toggle's on/off labels or a mode's per-choice tip). Resolves the
     * structure in each chosen locale and runs `format` to produce that locale's line.
     * Empty results (e.g. an unwritten secondary that falls back to an empty string) and
     * duplicates are skipped.
     */
    getMultilingualFrom<Structure>(
        accessor: (locale: LocaleText) => Structure,
        format: (structure: Structure) => string,
    ): MultilingualEntry[] {
        const result: MultilingualEntry[] = [];
        const seen = new Set<string>();
        const push = (locale: Locales) => {
            const text = withoutAnnotations(
                format(locale.getTextStructure(accessor)),
            );
            if (text.length === 0 || seen.has(text)) return;
            seen.add(text);
            const language = locale.getLocale().language;
            result.push({
                language,
                direction: getLanguageDirection(language),
                text,
            });
        };

        push(this);
        for (const view of this.getSecondaryLocaleViews()) push(view);

        return result;
    }

    /**
     * Get localized text, but strip the annotations.
     * Be careful to only use this when the UI doesn't need that metadata.
     * Joins all chosen locales (a NON-VISUAL plain string for aria-label/title);
     * collapses to the primary locale's text when only one locale is chosen. For VISIBLE
     * text use a styled component (LocalizedText) instead, not this.
     */
    getUnannotatedText(path: LocaleTextAccessor): string {
        return this.getMultilingualEntries(path)
            .map((entry) => entry.text)
            .join(MULTILINGUAL_SEPARATOR);
    }

    /**
     * Like {@link getUnannotatedText}, but only the primary locale. Use this when the
     * result is an identifier, map key, or compared for equality rather than displayed,
     * where joining multiple locales would be wrong.
     */
    getUnannotatedPrimaryText(path: LocaleTextAccessor): string {
        return withoutAnnotations(this.get(path));
    }

    /**
     * Given an accessor to a list of strings, get without annotations. Be careful when using this:
     * there won't be a UI for modifying the text in context.
     */
    getUnannotatedTexts(path: LocaleTextsAccessor): string[] {
        const texts = this.get(path);
        if (typeof texts === 'string') return [withoutAnnotations(texts)];
        else if (
            Array.isArray(texts) &&
            texts.every((t) => typeof t === 'string')
        )
            return texts.map((t) => withoutAnnotations(t));
        else return [];
    }

    /**
     * Given an accessor, get the text, and replace any annotations with appropriate
     * language to describe the annotation.
     */
    getPlainText(path: LocaleTextAccessor | string): string {
        // A pre-resolved string carries no accessor, so it can't be made multilingual.
        if (typeof path === 'string') return this.toPlainText(path);
        return this.getMultilingualRaw(path)
            .map(({ text }) => this.toPlainText(text))
            .join(MULTILINGUAL_SEPARATOR);
    }

    /** Strip annotations from a single locale string, re-appending the machine-translation
     *  symbol so it stays visible in plain-text contexts (tooltips, aria-labels). */
    private toPlainText(text: string): string {
        const isMT = text.startsWith(MachineTranslated);
        return `${withoutAnnotations(text)}${isMT ? withMonoEmoji(' ' + MACHINE_TRANSLATED_SYMBOL) : ''}`;
    }

    /**
     * A wrapper to make it explicit when an object of individual text strings is being retrived.
     * This is because we keep get() above private.
     */
    getTextStructure<Kind>(accessor: (locale: LocaleText) => Kind): Kind {
        return this.get(accessor);
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
    /**
     * Resolve a template and substitute its `$name` placeholders.
     *
     * Typed path form: when the path lambda returns `Template<Names>` (any
     * locale field typed via `Template<['a', 'b', ...]>`), TypeScript
     * requires `inputs` to be an object literal with exactly those keys.
     */
    concretize<Names extends readonly string[]>(
        textOrQuery: (locale: LocaleText) => Template<Names>,
        inputs?: { [K in Names[number]]: TemplateInput },
    ): Markup;
    /**
     * Raw-string form: used when the template was already resolved (e.g.
     * `Node.getDescription`). Key correctness is not enforced here — the
     * locale verifier checks it at CI time against the schema-declared
     * `Template<Names>` of the source field.
     */
    concretize(
        textOrQuery: string,
        inputs?: Record<string, TemplateInput>,
    ): Markup;
    concretize(
        textOrQuery: string | ((locale: LocaleText) => string),
        inputs: Record<string, TemplateInput> = {},
    ): Markup {
        const template =
            typeof textOrQuery === 'string'
                ? textOrQuery
                : this.get(textOrQuery);
        return this.concretizer(this, template, inputs);
    }

    getTermByID(id: string) {
        // Glossary entries are { word, definition }; the word is the display
        // term used when an @term reference appears. Iterate entries to look up
        // by a runtime string id without an unsafe keyof cast.
        for (const [key, entry] of Object.entries(this.getLocale().glossary))
            if (key === id) return entry.word;
        return undefined;
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
