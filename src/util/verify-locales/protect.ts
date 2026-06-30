/**
 * Protection and repair helpers for keeping Wordplay-specific syntax —
 * `\code\` blocks, `@Concept` links, and `$name` mentions — intact across a
 * machine translation round-trip. Extracted from `translate.ts` so backends can
 * share them; `translate.ts` re-exports everything here so existing importers
 * (and `translate.test.ts`) are unaffected.
 *
 * Two categories live here today:
 *  - Genuinely cross-backend repair: `splitMarkupAndCode`, `restoreReferences`,
 *    `repairMentionsPositional`, `preserveBalancedDelimiters`, the patterns.
 *  - Google/HTML-specific wrapping: `wrapProtected`/`wrapMentions`,
 *    `unwrapProtected`/`unwrapMentions`, `decodeHtmlEntities`. These pair with
 *    Google's `format: 'html'` + `translate="no"` round-trip and will NOT be
 *    used by the Claude backend (which uses extract-and-reinsert via
 *    `splitMarkupAndCode` + structured output instead).
 *
 * TODO (Phase 1): make the span/HTML wrapping translator-specific — move it to
 * the Google backend and keep only the cross-backend repair helpers shared.
 */

import {
    ConceptRegExPattern,
    MentionRegEx,
    TextCloseByTextOpen,
} from '@parser/Tokenizer';
import type Log from '@util/verify-locales/Log';

/** Wrap each `$name` mention in a `<span translate="no">` so Google Translate
 *  preserves it verbatim. Returns the wrapped string. The negative lookbehind
 *  keeps `$$N` (literal-dollar escape) from being treated as a mention. */
export function wrapMentions(text: string): string {
    return text.replace(
        new RegExp(`(?<!\\$)${MentionRegEx}`, 'gu'),
        (m) => `<span translate="no">${m}</span>`,
    );
}

/** Strip the wrappers we added in `wrapMentions`/`wrapProtected`, keeping their
 *  inner text. Uses a non-greedy any-character match so code-block content with
 *  `<` (e.g. comparisons like `2 < 3`) survives the round-trip. */
export function unwrapMentions(text: string): string {
    return text.replace(
        /<span\s+translate="no">([\s\S]*?)<\/span>/g,
        (_m, inner: string) => inner,
    );
}

/** Backwards-compatible alias for `unwrapMentions` — the unwrap step is the
 *  same regardless of which constructs were wrapped. */
export const unwrapProtected = unwrapMentions;

/** Walk a markup string and split it into alternating markup and code
 *  segments. Code segments are delimited by `\`; the delimiters are kept on
 *  the segment so wrapping preserves them verbatim. An unclosed trailing
 *  segment is treated as code so its content (including the opening `\`) is
 *  protected together. */
export function splitMarkupAndCode(
    text: string,
): Array<{ kind: 'markup' | 'code'; text: string }> {
    const segments: Array<{ kind: 'markup' | 'code'; text: string }> = [];
    let buffer = '';
    // Contexts entered since leaving markup; empty means we're in markup. A `\`
    // delimits an example only at the top level — inside a text literal it opens
    // an embedded expression (`\expr\`), and inside that expression a text literal
    // can nest again. We track that nesting instead of toggling on every `\`;
    // otherwise `\"sums \1 + 2\, \2 + 3\"\` is shredded into stray `\, \` pieces
    // (which parse as bogus `,` examples) and the inner expressions leak to markup.
    const stack: Array<{ kind: 'code' } | { kind: 'text'; close: string }> = [];
    for (const c of text) {
        if (stack.length === 0) {
            if (c === '\\') {
                if (buffer.length > 0)
                    segments.push({ kind: 'markup', text: buffer });
                buffer = '\\';
                stack.push({ kind: 'code' });
            } else buffer += c;
            continue;
        }
        buffer += c;
        const top = stack[stack.length - 1];
        if (top.kind === 'code') {
            if (c === '\\') {
                stack.pop();
                // Closing the top-level example ends the code segment; closing a
                // nested interpolation just returns us to its text literal.
                if (stack.length === 0) {
                    segments.push({ kind: 'code', text: buffer });
                    buffer = '';
                }
            } else if (TextCloseByTextOpen[c] !== undefined)
                stack.push({ kind: 'text', close: TextCloseByTextOpen[c] });
        } else if (c === '\\') stack.push({ kind: 'code' });
        else if (c === top.close) stack.pop();
    }
    if (buffer.length > 0)
        segments.push({
            kind: stack.length === 0 ? 'markup' : 'code',
            text: buffer,
        });
    return segments;
}

const PROTECT_OPEN = '<span translate="no">';
const PROTECT_CLOSE = '</span>';

/** Wrap each `\…\` code block, each `@Concept` link in markup, and each
 *  `$name` mention in a `<span translate="no">` so Google Translate preserves
 *  them verbatim. Code blocks are wrapped whole (delimiters included); concept
 *  links and mentions inside code blocks are already protected by the
 *  surrounding wrap and aren't double-wrapped. */
export function wrapProtected(text: string): string {
    const conceptPattern = new RegExp(ConceptRegExPattern, 'gu');
    const mentionPattern = new RegExp(`(?<!\\$)${MentionRegEx}`, 'gu');
    return splitMarkupAndCode(text)
        .map((seg) => {
            if (seg.kind === 'code')
                return `${PROTECT_OPEN}${seg.text}${PROTECT_CLOSE}`;
            return seg.text
                .replace(
                    conceptPattern,
                    (m) => `${PROTECT_OPEN}${m}${PROTECT_CLOSE}`,
                )
                .replace(
                    mentionPattern,
                    (m) => `${PROTECT_OPEN}${m}${PROTECT_CLOSE}`,
                );
        })
        .join('');
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

/**
 * Keep the source string when the translation's `\…\` example delimiters don't
 * balance. Google sometimes reorders the no-translate spans (notably in RTL
 * locales), orphaning a `\`; the resulting unclosed example breaks markup
 * tokenization for the whole doc. Source strings always have an even number of
 * `\`, so an odd count in the translation means it's broken — fall back to the
 * source (it'll show as still-needing-translation, not as a hard parse error).
 */
export function preserveBalancedDelimiters(
    log: Log,
    source: string,
    translation: string,
    targetLocale: string,
): string {
    const mismatched = mismatchedDelimiter(source, translation);
    if (mismatched === undefined) return translation;
    log.warning(
        2,
        `Kept the source for a string a translator left with a mismatched ${mismatched} delimiter in ${targetLocale}.`,
    );
    return source;
}

/**
 * Compare a translation's code (`\…\`) and formatted (`` `…` ``) delimiter counts
 * against its source. These delimiters are structural — localization renames
 * identifiers and translates text but never adds or drops a delimiter — so a
 * count that differs from the source means one was orphaned or duplicated (e.g.
 * an LLM doubling a backtick while localizing a nested example, or an older MT
 * dropping a trailing `\`), which breaks tokenization silently (the markup parser
 * skips a malformed example). Counting against the source — rather than checking
 * parity — correctly accepts examples with a legitimately odd count, like
 * external examples (`\tag|code\tag|code\`) and docs that mention a literal `\`.
 * Returns the mismatched delimiter's display form, or undefined if both match.
 */
export function mismatchedDelimiter(
    source: string,
    translation: string,
): string | undefined {
    const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;
    if (count(source, /\\/g) !== count(translation, /\\/g)) return '\\…\\';
    if (count(source, /`/g) !== count(translation, /`/g)) return '`…`';
    return undefined;
}

/**
 * Whether `code` ends inside an unterminated text literal — e.g. a localized
 * identifier that picked up an apostrophe written as `'` (a string delimiter),
 * leaving `…'brien: 5` open. This swallows the rest of a doc when the example is
 * re-embedded, and unlike a dropped `\`/`` ` `` it doesn't change those counts, so
 * `mismatchedDelimiter` can't see it. Tracks text-literal nesting (a `\…\` inside a
 * literal is an embedded expression, not a close), mirroring `splitMarkupAndCode`;
 * balanced literals (including interpolations) return false.
 */
export function hasUnclosedText(code: string): boolean {
    let close: string | undefined;
    let inInterp = false;
    for (const c of code) {
        if (close === undefined) {
            if (TextCloseByTextOpen[c] !== undefined)
                close = TextCloseByTextOpen[c];
        } else if (!inInterp && c === close) close = undefined;
        else if (c === '\\') inInterp = !inInterp;
    }
    return close !== undefined;
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
