/**
 * Shared, pure text helpers for locale-markup tooling (linkGlossary,
 * linkGlossaryDefinitions). They find whole-word occurrences of terms in a
 * locale string while never touching markup that's already there: `\code\`
 * blocks, existing `@`-references, and `$`-mentions.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A `@Concept` / `@term` reference, optionally with a `.member` or `/lang`. */
const CONCEPT = /@[\p{L}][\p{L}\p{N}]*(?:[./][\p{L}\p{N}]+)?/gu;
/** A `$mention` (not doubled), matching MENTION handling in the locale tooling. */
const MENTION = /(?<!\$)\$([a-zA-Z0-9]+|\?|!)/g;
/** An embedded `\code\` block (a Wordplay program). */
const CODE = /\\[^\\]*\\?/g;

export function isWordChar(c: string | undefined): boolean {
    return c !== undefined && /[\p{L}\p{N}]/u.test(c);
}

/** Collect [start, end) ranges that must not be touched: code blocks, concept
 *  references, and existing mentions. */
export function protectedRanges(text: string): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];
    for (const re of [CODE, CONCEPT, MENTION]) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
            ranges.push([m.index, m.index + m[0].length]);
            if (m[0].length === 0) re.lastIndex++;
        }
    }
    return ranges;
}

/** First whole-word, unprotected occurrence of `find` (case-sensitive), or -1.
 *  Skips member accesses (`.name`) and anything inside a protected range. */
export function findWholeWord(
    text: string,
    find: string,
    ranges: Array<[number, number]>,
): number {
    let from = 0;
    for (;;) {
        const i = text.indexOf(find, from);
        if (i < 0) return -1;
        const end = i + find.length;
        if (
            !isWordChar(text[i - 1]) &&
            text[i - 1] !== '.' && // not a member access like `@Phrase.name`
            !isWordChar(text[end]) &&
            !ranges.some(([s, e]) => i >= s && i < e)
        )
            return i;
        from = i + 1;
    }
}

export function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
