import DefaultLocale from '@locale/DefaultLocale';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import { withoutAnnotations } from '@locale/withoutAnnotations';
import type Markup from '@nodes/Markup';

/**
 * A plain-text glossary block for the translation prompt: each en-US term's word
 * and a simplified definition (cross-reference markers stripped). When `target`
 * is given, each term shows its target-language word too — `"<en>" -> "<target>"`
 * — so the model translates bare occurrences of the term to that word (the point
 * of the glossary) rather than leaving English. Pass `undefined` (e.g. before the
 * target glossary is translated) to get the en-only form.
 */
export function getGlossaryForPrompt(target: LocaleText | undefined): string {
    // Map target glossary ids → localized word (markers stripped). Iterate
    // entries so a string id needs no unsafe keyof cast.
    const targetWords = new Map<string, string>();
    if (target !== undefined)
        for (const [id, entry] of Object.entries(target.glossary)) {
            const word = withoutAnnotations(entry.word).trim();
            if (word.length > 0) targetWords.set(id, word);
        }
    return Object.entries(DefaultLocale.glossary)
        .map(([id, entry]) => {
            const def = entry.definition.replace(/[$@]([A-Za-z]+)/g, '$1');
            const targetWord = targetWords.get(id);
            return targetWord !== undefined && targetWord !== entry.word
                ? `- "${entry.word}" -> "${targetWord}": ${def}`
                : `- ${entry.word}: ${def}`;
        })
        .join('\n');
}

/** What a folded surface form names: the glossary id it belongs to, and whether
 *  the form came from the locale being displayed (so a reference can show the
 *  form as written) or from the en-US fallback (so it shows this locale's
 *  canonical word instead). */
export type GlossaryFormMatch = {
    readonly id: string;
    readonly native: boolean;
};

/** Folded surface form → the term it names. See `getGlossaryFormIndex`. */
export type GlossaryFormIndex = ReadonlyMap<string, GlossaryFormMatch>;

/**
 * The folding applied to both sides of a form lookup: annotations stripped,
 * trimmed, NFC-normalized (so a decomposed matra or accent matches a composed
 * one), and lowercased with the locale-independent `toLowerCase` so the index
 * and the lookup can never disagree about whose casing rules apply. Nothing is
 * stripped beyond that, since combining marks are meaning-bearing. A locale
 * whose casing `toLowerCase` gets wrong (e.g. Turkish `İ`) can always list the
 * cased form itself, since `forms` is an arbitrary list.
 */
export function foldGlossaryForm(text: string): string {
    return withoutAnnotations(text).normalize('NFC').toLowerCase();
}

/** A term's usable extra forms in one locale: annotation-free, trimmed, empties
 *  dropped. Iterates entries so a runtime string id needs no unsafe keyof cast. */
export function getGlossaryForms(locale: LocaleText, id: string): string[] {
    for (const [key, entry] of Object.entries(locale.glossary))
        if (key === id)
            return (entry.forms ?? [])
                .map((form) => withoutAnnotations(form))
                .filter((form) => form.length > 0);
    return [];
}

/** Memoized per locale, since the index is rebuilt on every markup
 *  concretization. Keyed on `LocaleText` rather than `Locales`, since
 *  `getSecondaryLocaleViews` mints a fresh `Locales` on every render. */
const indexByLocale = new WeakMap<LocaleText, GlossaryFormIndex>();

/**
 * Every way a `@reference` can name a glossary term in this locale: each term's
 * id, its canonical word, and each of its extra forms, all folded. En-US's are
 * merged in as non-native matches, so a translated string that kept an English
 * reference verbatim (concept links are protected through translation) still
 * resolves — displaying this locale's canonical word rather than the English
 * form. Inserts never overwrite, so this locale always wins over the fallback.
 */
export function getGlossaryFormIndex(locale: LocaleText): GlossaryFormIndex {
    const cached = indexByLocale.get(locale);
    if (cached) return cached;

    const index = new Map<string, GlossaryFormMatch>();
    const add = (form: string, id: string, native: boolean) => {
        const folded = foldGlossaryForm(form);
        if (folded.length > 0 && !index.has(folded))
            index.set(folded, { id, native });
    };
    const addLocale = (text: LocaleText, native: boolean) => {
        for (const [id, entry] of Object.entries(text.glossary)) {
            add(id, id, native);
            add(entry.word, id, native);
            for (const form of entry.forms ?? []) add(form, id, native);
        }
    };
    addLocale(locale, true);
    // The fallback is always en-US, not `Locales.fallback`: in a secondary
    // locale view the fallback is the locale itself, which would leave an
    // English reference in a multilingual echo unresolved.
    if (locale !== DefaultLocale) addLocale(DefaultLocale, false);

    indexByLocale.set(locale, index);
    return index;
}

/** The raw (annotated) word for a glossary id in one locale, or '' if absent.
 *  Raw rather than stripped because it seeds the inline editor and decides
 *  whether the machine-translated badge shows; use `withoutAnnotations` for
 *  anything displayed. Iterates entries so a runtime string id needs no unsafe
 *  keyof cast. */
export function getTermWordString(locale: LocaleText, id: string): string {
    for (const [key, entry] of Object.entries(locale.glossary))
        if (key === id) return entry.word;
    return '';
}

/** The raw (unconcretized) definition string for a glossary id in one locale,
 *  or '' if absent. Iterates entries so a runtime string id needs no unsafe
 *  keyof cast. Use as a `LocaleTextAccessor`, e.g. with `getMultilingualMarkup`. */
export function getTermDefinitionString(
    locale: LocaleText,
    id: string,
): string {
    for (const [key, entry] of Object.entries(locale.glossary))
        if (key === id) return entry.definition;
    return '';
}

/**
 * The concretized definition of a glossary term as Markup — its `@term` and
 * `@Concept` cross-references resolved — for display in the glossary UI. Use
 * `.toText()` for a plain-text form (e.g. a tooltip).
 */
export function getTermDefinition(locales: Locales, id: string): Markup {
    return locales.concretize((l) => getTermDefinitionString(l, id));
}
