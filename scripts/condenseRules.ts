/**
 * The pure half of the changelog condensation pass: which entries are
 * candidates, and whether a proposed rewrite may be accepted.
 *
 * Separated from the model call so every rule is unit-testable at no cost —
 * these decide what happens to 511 published entries, and a mistake in one of
 * them is a silent edit to the public record.
 */

import { coveredLength } from '@util/verify-locales/verifyChangelog';
import { parseEntry, toMarkup } from './updates';

/** Why a rewrite was refused. The original is kept in every case. */
export type Rejection =
    /** Refused on reading, not by a rule: the rewrite lost a fact. */
    | 'review'
    | 'empty'
    | 'longer'
    | 'sentences'
    | 'code'
    | 'link'
    | 'citation'
    | 'markup';

/** The reason a rewrite is allowed a second sentence, declared by the model so
 *  the exception is auditable rather than inferred from the text. */
export type SecondReason = 'code' | 'caveat' | null;

/**
 * Blank out everything that carries a period but is not a sentence boundary:
 * code spans, issue citations, link targets, and the two abbreviations the
 * changelog actually uses. Without this, a version number or a unit inside
 * backticks reads as a sentence break and half the corpus is miscounted.
 */
export function maskForSentences(text: string): string {
    return text
        .replace(/`[^`]*`/g, 'CODE')
        .replace(/\(#[0-9,\s#]+\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\be\.g\./gi, 'eg')
        .replace(/\bi\.e\./gi, 'ie');
}

/** Sentences in an entry. An entry with no terminal punctuation is still one
 *  sentence, not zero. */
export function countSentences(text: string): number {
    return (maskForSentences(text).match(/[.!?](\s|$)/g) ?? []).length || 1;
}

/** An entry is a candidate exactly when it has something to lose. */
export function isCandidate(text: string): boolean {
    return countSentences(text) > 1;
}

/** The contents of every code span, in order. */
export function codeSpans(text: string): string[] {
    return [...text.matchAll(/`([^`]*)`/g)].map((m) => m[1]);
}

/** Every Markdown link target, in order. */
export function linkTargets(text: string): string[] {
    return [...text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((m) => m[1]);
}

/** Every issue citation number, in order. */
export function citations(text: string): string[] {
    return [...text.matchAll(/#(\d+)/g)].map((m) => m[1]);
}

/** Whether two lists hold the same items, ignoring order. */
function sameMultiset(before: string[], after: string[]): boolean {
    if (before.length !== after.length) return false;
    return [...before].sort().join(' ') === [...after].sort().join(' ');
}

/**
 * Whether a proposed rewrite may replace its original, and why not.
 *
 * The three multiset checks are the load-bearing ones. A code span, a link, and
 * an issue citation are the concrete parts of an entry — the only things in it
 * a reader can act on — so a condensation that drops a clause carrying one has
 * cut the wrong clause, and must keep it and cut elsewhere. Comparing multisets
 * rather than counts means a rewrite cannot quietly swap one URL for another.
 */
export function rejectRewrite(
    before: string,
    after: string,
    second: SecondReason,
): Rejection | undefined {
    const trimmed = after.trim();
    if (trimmed.length === 0) return 'empty';
    if (trimmed.length >= before.length) return 'longer';

    const sentences = countSentences(trimmed);
    if (sentences > 2) return 'sentences';
    if (sentences === 2 && second === null) return 'sentences';

    if (!sameMultiset(codeSpans(before), codeSpans(trimmed))) return 'code';
    if (!sameMultiset(linkTargets(before), linkTargets(trimmed))) return 'link';
    if (!sameMultiset(citations(before), citations(trimmed))) return 'citation';

    // The rule that caught an entry already rendering at 54% of its length, and
    // the defect the last hand pass over this file introduced: a Markdown code
    // span that becomes an unbalanced Example truncates everything after it,
    // silently.
    const { covered, total } = coveredLength(toMarkup(trimmed));
    if (covered < total) return 'markup';

    return undefined;
}

/** How much shorter a rewrite is, as a fraction of the original. */
export function reduction(before: string, after: string): number {
    return (before.length - after.trim().length) / before.length;
}

/** One bullet of a dated release, located by line so it can be spliced back. */
export type Candidate = {
    /** 0-based index into the file's lines. */
    line: number;
    /** The whole original line, which `apply` re-checks before replacing it. */
    original: string;
    version: string;
    /** The marker, kept out of the model's reach entirely. */
    emoji: string | null;
    /** What the model is asked to rewrite. */
    body: string;
};

/**
 * Find every bullet in a dated release that has more than one sentence.
 *
 * Line-based rather than via `parseChangelog`, because the splice needs line
 * numbers and every one of the file's bullets is exactly one line — there are
 * no soft-wrapped continuations, and prettier's `proseWrap: preserve` keeps it
 * that way even at 628 characters.
 */
export function scanCandidates(lines: string[]): Candidate[] {
    const found: Candidate[] = [];
    let version: string | undefined;
    lines.forEach((line, index) => {
        const release = line.match(/^## (\d+\.\d+\.\d+) - \d{4}-\d{2}-\d{2}$/);
        if (release) {
            version = release[1];
            return;
        }
        // A dateless `## 0.16.38` heading ends the current release: the page
        // filters those out, so their entries are never translated.
        if (/^## /.test(line)) {
            version = undefined;
            return;
        }
        if (version === undefined || !line.startsWith('- ')) return;
        const { text, emoji } = parseEntry(line.slice(2).trim());
        if (isCandidate(text))
            found.push({
                line: index,
                original: line,
                version,
                emoji,
                body: text,
            });
    });
    return found;
}
