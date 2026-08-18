import type LocaleText from './LocaleText';
import { withoutAnnotations } from './withoutAnnotations';

/**
 * The target locale's own writing conventions, formatted for the translation
 * system prompt: its `guidance` prose and its `terms` word list.
 *
 * Both are per-locale original content rather than translations of en-US, so
 * they record decisions only that locale's writers can make — form of address,
 * tone, gendered forms, regional lexicon, and the product terms already settled
 * on. Without them in the prompt a locale's guidance is documentation nothing
 * reads, and each re-translation is free to contradict choices the locale had
 * already made (es-MX, for instance, mandates *flujo* for a stream and then
 * carries `stream` untranslated in the same file — see #939).
 *
 * Returns the empty string when the locale declares neither, so the prompt for
 * a locale without conventions stays byte-identical and keeps its cache.
 */
export function getConventionsForPrompt(
    target: LocaleText | undefined,
): string {
    if (target === undefined) return '';

    const sections: string[] = [];

    // Annotations are stripped: the markers are bookkeeping for the verifier,
    // not something the model should see or imitate.
    const guidance = withoutAnnotations(target.guidance ?? '');
    if (guidance.length > 0)
        sections.push(
            `Conventions for ${target.language}, written by this locale's own translators. They outrank your defaults for this language — but never the @Concept and $name preservation rules above, which always win:
${guidance}`,
        );

    const terms = Object.entries(target.terms ?? {})
        .map(([key, phrase]): [string, string] => [
            key,
            withoutAnnotations(phrase),
        ])
        .filter(([, phrase]) => phrase.length > 0)
        .map(([key, phrase]) => `- $${key} renders as "${phrase}"`);
    if (terms.length > 0)
        sections.push(
            `This locale substitutes a phrase wherever these $name references appear. Keep the reference verbatim as always, but write the surrounding text so it reads correctly with the phrase in place:
${terms.join('\n')}`,
        );

    return sections.join('\n\n');
}
