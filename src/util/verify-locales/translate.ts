import Translate from '@google-cloud/translate';
import type LanguageCode from '@locale/LanguageCode';
import type { RegionCode } from '@locale/Regions';
import { ConceptRegExPattern, MentionRegEx } from '@parser/Tokenizer';
import type Log from '@util/verify-locales/Log';

export const GoogleTranslate = new Translate.v2.Translate();

export default async function translate(
    log: Log,
    text: string[],
    sourceLocale: string,
    targetLocale: string,
): Promise<string[] | undefined> {
    // Split the strings into groups of 100, since Google Translate only allows 128 at a time.
    const sourceStringsBatches: string[][] = [];
    while (text.length > 0) sourceStringsBatches.push(text.splice(0, 100));

    // Pass them to Google Translate
    let translations: string[] = [];
    for (const batch of sourceStringsBatches) {
        try {
            // Wrap every `$name` mention in a no-translate span before sending.
            // Translate guarantees verbatim preservation of nodes marked
            // `translate="no"`, which keeps Google from transliterating
            // `$expected` to `$المتوقع`, dropping the `$`, or otherwise
            // garbling the placeholder. We strip the wrappers after.
            const wrapped = batch.map(wrapMentions);
            const [translatedBatch] = await GoogleTranslate.translate(
                wrapped,
                {
                    from: sourceLocale,
                    to: targetLocale,
                    format: 'html',
                },
            );
            const restored = translatedBatch
                .map(unwrapMentions)
                .map(decodeHtmlEntities)
                // Restore concept links (`@Foo`) using order-based matching.
                .map((translation, index) =>
                    restoreReferences(
                        batch[index],
                        translation,
                        ConceptPattern,
                    ),
                )
                // Safety net: if the no-translate wrapper failed for any
                // reason and a `$name` got mangled anyway, fall back to a
                // positional repair against the source's mention list.
                .map((translation, index) =>
                    repairMentionsPositional(batch[index], translation),
                );
            translations = [...translations, ...restored];
            log.good(
                2,
                `Translated ${batch.length} strings from ${sourceLocale} to ${targetLocale} ...`,
            );
        } catch (error) {
            console.error(error);
            return undefined;
        }
    }
    return translations;
}

/** Wrap each `$name` mention in a `<span translate="no">` so Google Translate
 *  preserves it verbatim. Returns the wrapped string. The negative lookbehind
 *  keeps `$$N` (literal-dollar escape) from being treated as a mention. */
export function wrapMentions(text: string): string {
    return text.replace(
        new RegExp(`(?<!\\$)${MentionRegEx}`, 'gu'),
        (m) => `<span translate="no">${m}</span>`,
    );
}

/** Strip the wrappers we added in `wrapMentions`, keeping their inner text. */
export function unwrapMentions(text: string): string {
    return text.replace(
        /<span\s+translate="no">([^<]*)<\/span>/g,
        (_m, inner: string) => inner,
    );
}

/** Decode the HTML entities Google Translate emits when `format: 'html'`. */
export function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&#(\d+);/g, (_m, code: string) =>
            String.fromCodePoint(parseInt(code, 10)),
        )
        .replace(/&#x([0-9a-fA-F]+);/g, (_m, code: string) =>
            String.fromCodePoint(parseInt(code, 16)),
        )
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

/**
 * Safety net for the no-translate wrapper. If the translated string ends up
 * with the same *count* of mentions as the source but their text differs
 * (e.g. transliterated, capitalized, or partially eaten), rewrite them
 * positionally using the source's ordered mention list.
 *
 * Leaves the translation alone when counts disagree — those cases need
 * human review, and the locale verifier will surface them.
 */
export function repairMentionsPositional(
    before: string,
    after: string,
): string {
    const sourceMentions = Array.from(
        before.matchAll(new RegExp(MentionRegEx, 'gu')),
    ).map((m) => m[0]);
    if (sourceMentions.length === 0) return after;
    // Find anything in `after` that starts with `$` and runs until the next
    // whitespace, punctuation, or symbol — broader than `MentionRegEx` so we
    // catch mangled non-ASCII tails like `$المتوقع`. The `\p{P}\p{S}` Unicode
    // classes cover script-specific punctuation like Arabic comma `،`,
    // Chinese 。, etc.
    const looseRe = /(?<!\$)\$[^\s\p{P}\p{S}]+/gu;
    const afterMentions = Array.from(after.matchAll(looseRe)).map((m) => m[0]);
    if (afterMentions.length !== sourceMentions.length) return after;
    // If every mention already matches the source order, nothing to do.
    if (afterMentions.every((m, i) => m === sourceMentions[i])) return after;
    let i = 0;
    return after.replace(looseRe, () => sourceMentions[i++]);
}

export async function getGoogleTranslateTargetLocale(
    language: LanguageCode,
    regions: RegionCode[],
): Promise<string> {
    const [languages] = await GoogleTranslate.getLanguages();
    const locales = Array.from(languages)
        .map((l) => l.code)
        .filter((l) => l.startsWith(language));
    const targetRegion = regions.find((r) =>
        locales.includes(`${language}-${r}`),
    );
    return `${language}${targetRegion ? `-${targetRegion}` : ''}`;
}

export const ConceptPattern = new RegExp(ConceptRegExPattern, 'ug');
export const MentionPattern = new RegExp(MentionRegEx, 'ug');

/**
 * Take a string with zero or more concept links, find the corresponding ones in the after string,
 * and replace them with the original links.
 */
export function restoreReferences(
    before: string,
    after: string,
    pattern: RegExp,
): string {
    // Find all concept links in the before string.
    const beforeConcepts = Array.from(before.matchAll(pattern)).map(
        (s) => s[0],
    );
    // Didn't find any? Return the translated string.
    if (beforeConcepts.length === 0) return after;

    // Replace the concept links in the after string.
    const afterConceptLinks = Array.from(after.matchAll(pattern));
    // Didn't find any? That's not good. Return the translated string.
    if (afterConceptLinks === null) return after;

    // Restore all concepts in the after string.
    const mapping = new Map<string, string>();
    for (let index = 0; index < afterConceptLinks.length; index++) {
        // Get the matching text and index.
        const afterText = afterConceptLinks[index][0];

        // Is the text in the list of before concepts? Assume it was preserved and keep it.
        if (beforeConcepts.includes(afterText)) continue;

        // Otherwise, choose the next before concept link name, assuming order was preserved (which is is not always, as grammar can reverse things).
        const beforeText = beforeConcepts.shift() ?? mapping.get(afterText);

        // No before text or text is the same? Just keep it the same.
        if (beforeText === undefined || beforeText === afterText) continue;

        // Remember the mapping we found, so we can do a bulk search and replace after.
        mapping.set(beforeText, afterText);
    }

    for (const [beforeText, afterText] of mapping.entries()) {
        after = after.replaceAll(afterText, beforeText);
    }

    // If there are any dangling concepts that are a concept symbol followed by a non-letter, remove it.
    after = after.replace(/@\P{Letter}/gu, '');

    return after;
}
