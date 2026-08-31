import type LocaleText from '@locale/LocaleText';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import type Log from '@util/verify-locales/Log';
import { splitMarkupAndCode } from '@util/verify-locales/protect';

/**
 * Find an example whose own documentation is still the English.
 *
 * An example is code, so `splitMarkupAndCode` hands the whole `\…\` to nobody
 * and `translateProjectContent` localizes it instead — parsing it as a program
 * and translating its names, its text literals, and the `¶…¶` doc attached to
 * it. When that last part doesn't happen, the string is left in a state no
 * other check can see: its names *are* translated, so it is not byte-identical
 * to en-US and reads as translated everywhere, while the sentence a reader
 * actually sees stays English.
 *
 * Nine strings sat like that, eight of them claiming `$~`. All nine were the
 * landing page's carousel captions — the first prose a visitor reads — in
 * Punjabi, Assamese, French, Persian, and Japanese.
 *
 * `translationEcho.test.ts` asks the same question of a `$~` claim and cannot
 * reach these: it covers tutorials rather than locale files, compares whole
 * strings byte-for-byte, and judges a locale by a percentage rather than a
 * string. An example is a composite, so the claim has to be checked at the
 * granularity of the piece a reader sees.
 */

/** The docs written inside a value's examples, in order. */
function exampleDocs(value: string): string[] {
    return splitMarkupAndCode(value)
        .filter((segment) => segment.kind === 'code')
        .flatMap((segment) => [...segment.text.matchAll(/¶([^¶]*)¶/g)])
        .map((match) => match[1].trim());
}

/** Prose, rather than a name, a symbol, or a scrap of code. */
function prose(text: string): boolean {
    return /[A-Za-z]+\s+[A-Za-z]+/.test(text);
}

export default function checkExampleDocs(
    log: Log,
    source: LocaleText,
    target: LocaleText,
): void {
    const untranslated: string[] = [];

    for (const pair of getKeyTemplatePairs(target)) {
        const value = pair.value;
        if (typeof value !== 'string') continue;
        // `$?` is honestly unwritten and expected to be the English.
        if (value.startsWith('$?')) continue;
        const english = pair.resolve(source);
        if (typeof english !== 'string') continue;

        const mine = exampleDocs(value);
        const theirs = exampleDocs(english);
        // A different number of docs is drift, which is someone else's
        // business; comparing them by index would compare unrelated sentences.
        if (mine.length === 0 || mine.length !== theirs.length) continue;

        for (const [index, doc] of mine.entries())
            if (doc === theirs[index] && prose(doc))
                untranslated.push(`${pair.toString()} ("${doc.slice(0, 40)}")`);
    }

    if (untranslated.length > 0) {
        const listed = untranslated.slice(0, 20);
        const rest = untranslated.length - listed.length;
        log.bad(
            `${untranslated.length} example doc(s) are still the English while the code around them is translated, so nothing else can tell: ${listed.join(', ')}${rest > 0 ? `, and ${rest} more` : ''}. "npm run locales-override -- <locale> +locale:<path>" re-translates one.`,
        );
    }
}
