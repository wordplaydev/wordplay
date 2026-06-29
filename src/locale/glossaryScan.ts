import type { GlossaryWord, LiteralTermFinding } from 'shared-types';

/**
 * The free, client-side heuristic that powers the in-app localization
 * workspace's live "use `@term`" suggestions. It finds glossary words written
 * as literal prose that could be symbolic `@term` references, with a one-click
 * fix. It's intentionally a heuristic (may over-suggest common words); the
 * server analysis ([functions/src/analyzeLocalization.ts](functions/src/analyzeLocalization.ts))
 * has Claude judge genuine usages for the PR. Kept here (not in `shared-types`)
 * because the client can't import a runtime value across the functions↔src wall.
 */

/** The mention rule, matching `MENTION_RE` in `templateInputs.ts`: a `$` (not
 *  doubled) followed by an id, `?`, or `!`. */
const MENTION_RE = /(?<!\$)\$([a-zA-Z0-9]+|\?|!)/g;
/** A `@Concept` reference, optionally language-tagged (e.g. `@Phrase/en`). */
const CONCEPT_RE = /@[\p{L}][\p{L}\p{N}]*(?:\/[\p{L}]+)?/gu;
/** An embedded `\code\` block (Wordplay program). */
const CODE_RE = /\\[^\\]*\\?/g;

function isWordChar(c: string | undefined): boolean {
    return c !== undefined && /[\p{L}\p{N}]/u.test(c);
}

/** Collect [start, end) ranges that must not be touched: code blocks, concept
 *  references, and existing mentions. */
function protectedRanges(text: string): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];
    for (const re of [CODE_RE, CONCEPT_RE, MENTION_RE]) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
            ranges.push([m.index, m.index + m[0].length]);
            if (m[0].length === 0) re.lastIndex++;
        }
    }
    return ranges;
}

function inAnyRange(index: number, ranges: Array<[number, number]>): boolean {
    return ranges.some(([start, end]) => index >= start && index < end);
}

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Scan `text` for the first whole-word, case-insensitive occurrence of each
 * glossary word that isn't inside a protected range, returning one finding per
 * term whose `suggestion` replaces that occurrence with `@id`.
 */
export default function scanLiteralGlossaryTerms(
    text: string,
    glossary: GlossaryWord[],
): LiteralTermFinding[] {
    const ranges = protectedRanges(text);
    const findings: LiteralTermFinding[] = [];

    for (const { id, word } of glossary) {
        if (word.trim().length === 0) continue;
        const re = new RegExp(escapeRegExp(word), 'giu');
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
            const start = m.index;
            const end = start + m[0].length;
            if (isWordChar(text[start - 1]) || isWordChar(text[end])) continue;
            if (inAnyRange(start, ranges)) continue;
            findings.push({
                term: m[0],
                id,
                suggestion: text.slice(0, start) + '@' + id + text.slice(end),
            });
            break; // one finding per term keeps suggestions unambiguous
        }
    }

    return findings;
}
