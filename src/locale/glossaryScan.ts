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
/** A `@Concept` reference, optionally carrying a subconcept or language suffix
 *  (e.g. `@Phrase.name`, `@Phrase/en`). The `.property` half matters: matching
 *  only the head left `name` in `@Phrase.name` unprotected, so a term whose word
 *  is `name` was "linked" inside the reference, rewriting it to `@Phrase.@name`
 *  and breaking it. Mirrors `ConceptRegExPattern` in the tokenizer, which allows
 *  either separator. */
const CONCEPT_RE = /@[\p{L}][\p{L}\p{N}]*(?:[./][\p{L}][\p{L}\p{N}]*)?/gu;
/** An embedded `\code\` block (Wordplay program). */
const CODE_RE = /\\[^\\]*\\?/g;
/** A `<label@url>` web link. The `@` inside one is a separator, not a
 *  reference, so linking a term in the label ran the two together:
 *  `<2-letter code@https://…>` became `<2-letter @code@https://…>`, which is no
 *  longer a link. Requiring an `@` inside keeps this off ordinary `<`/`>` prose. */
const WEBLINK_RE = /<[^<>\n]*@[^<>\n]*>/g;

/** Combining marks count as part of the word, the rule `REFERENCEABLE` below
 *  already follows. Without them a word carrying a mark the glossary's own
 *  spelling lacks — Arabic `\u0645\u0646\u0637\u0642\u0629\u0654` against `\u0645\u0646\u0637\u0642\u0629` — passed the
 *  boundary test, and the mark was orphaned onto the reference (`@region\u0654`),
 *  which then resolved to nothing. */
function isWordChar(c: string | undefined): boolean {
    return c !== undefined && /[\p{L}\p{M}\p{N}]/u.test(c);
}

/** Collect [start, end) ranges that must not be touched: code blocks, concept
 *  references, and existing mentions. */
function protectedRanges(text: string): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];
    for (const re of [CODE_RE, WEBLINK_RE, CONCEPT_RE, MENTION_RE]) {
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

/** Whether the matched text can be written as a reference: a reference's name
 *  run ends at a space or an operator, so a multi-word or hyphenated form (e.g.
 *  "side effects") has no reference form. Combining marks are letters here —
 *  Devanagari matras must stay attached to their consonant. */
const REFERENCEABLE = /^[\p{L}\p{M}\p{N}]+$/u;

/** The first whole-word, case-insensitive occurrence of `candidate` in `text`
 *  that isn't inside a protected range. */
function findOccurrence(
    text: string,
    candidate: string,
    ranges: Array<[number, number]>,
): { start: number; matched: string } | undefined {
    const re = new RegExp(escapeRegExp(candidate), 'giu');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        if (isWordChar(text[start - 1]) || isWordChar(text[end])) continue;
        if (inAnyRange(start, ranges)) continue;
        return { start, matched: m[0] };
    }
    return undefined;
}

/**
 * Scan `text` for the first whole-word, case-insensitive occurrence of each
 * glossary word, or of one of its other written forms, that isn't inside a
 * protected range. A match on the canonical word suggests `@id`; a match on
 * another form suggests a reference written with the matched text, so an
 * inflected word becomes one whole link and keeps its capitalization. Longer
 * candidates are tried first, so a plural is preferred over the singular inside
 * it. A form no reference can express is skipped rather than offered as a
 * broken fix.
 */
export default function scanLiteralGlossaryTerms(
    text: string,
    glossary: GlossaryWord[],
): LiteralTermFinding[] {
    const ranges = protectedRanges(text);
    const findings: LiteralTermFinding[] = [];

    for (const { id, word, forms } of glossary) {
        const candidates = [word, ...(forms ?? [])]
            .filter((candidate) => candidate.trim().length > 0)
            .sort((a, b) => b.length - a.length);
        for (const candidate of candidates) {
            const occurrence = findOccurrence(text, candidate, ranges);
            if (occurrence === undefined) continue;
            const { start, matched } = occurrence;
            const reference =
                candidate === word
                    ? id
                    : REFERENCEABLE.test(matched)
                      ? matched
                      : undefined;
            if (reference === undefined) continue;
            findings.push({
                term: matched,
                id,
                suggestion:
                    text.slice(0, start) +
                    '@' +
                    reference +
                    text.slice(start + matched.length),
            });
            break; // one finding per term keeps suggestions unambiguous
        }
    }

    return findings;
}
