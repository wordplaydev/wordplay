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
