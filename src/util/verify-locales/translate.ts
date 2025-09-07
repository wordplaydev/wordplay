import Translate from '@google-cloud/translate';
import { ConceptRegExPattern, MentionRegEx } from '@parser/Tokenizer';
import type Log from './Log';

export default async function translate(
    log: Log,
    text: string[],
    source: string,
    target: string,
): Promise<string[] | undefined> {
    // Split the strings into groups of 100, since Google Translate only allows 128 at a time.
    const sourceStringsBatches: string[][] = [];
    while (text.length > 0) sourceStringsBatches.push(text.splice(0, 100));

    // Pass them to Google Translate
    let translations: string[] = [];
    for (const batch of sourceStringsBatches) {
        try {
            // Create a Google Translate client
            const translator = new Translate.v2.Translate();
            // Translate the strings
            const [translatedBatch] = await translator.translate(batch, {
                from: source,
                to: target,
            });
            translations = [
                ...translations,
                // Restore concepts in all of the translated strings.
                ...translatedBatch
                    .map((translation, index) =>
                        restoreReferences(
                            batch[index],
                            translation,
                            ConceptPattern,
                        ),
                    )
                    .map((translation, index) =>
                        restoreReferences(
                            batch[index],
                            translation,
                            MentionPattern,
                        ),
                    ),
            ];
            log.good(2, 'Translated ' + batch.length + ' strings...');
        } catch (error) {
            console.error(error);
            return undefined;
        }
    }
    return translations;
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
