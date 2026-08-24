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

import { getPluralBranches } from '@locale/templateInputs';
import {
    ConceptRegExPattern,
    MentionRegEx,
    TextCloseByTextOpen,
} from '@parser/Tokenizer';
import { DOCS_SYMBOL } from '@parser/Symbols';
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

/** Split markup into paragraphs at blank lines, but never inside `\…\` example
 *  code, where blank lines are legitimate content (e.g. multi-paragraph doc
 *  literals, blank lines in multi-line code). Built on `splitMarkupAndCode`, so
 *  unbalanced delimiters in corrupted input degrade to a trailing code segment
 *  that is never split. Paragraphs are trimmed and empties dropped. */
export function splitDocParagraphs(text: string): string[] {
    const paragraphs: string[] = [];
    let current = '';
    for (const segment of splitMarkupAndCode(text)) {
        if (segment.kind === 'code') current += segment.text;
        else {
            const parts = segment.text.split(/\n{2,}/);
            current += parts[0];
            for (const part of parts.slice(1)) {
                paragraphs.push(current);
                current = part;
            }
        }
    }
    paragraphs.push(current);
    return paragraphs.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** Whether markup contains a paragraph break outside example code — the one
 *  thing a markup array element must never contain, since element boundaries
 *  are the paragraph breaks. */
export function hasOutOfExampleBreak(text: string): boolean {
    return splitMarkupAndCode(text).some(
        (segment) => segment.kind === 'markup' && /\n{2,}/.test(segment.text),
    );
}

/** The leading annotation markers ($?/$!/$~, see @locale/Annotations) on a
 *  locale string, or the empty string if unannotated. */
export function leadingAnnotations(text: string): string {
    return text.match(/^(?:\$[?!~])+/)?.[0] ?? '';
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
 * Whether a translation lost or malformed a plural branch its source has.
 *
 * A `$#name[…]` selects one wording per plural form, and a translation that
 * keeps the arms but drops the `$#name` in front of them reads as a literal
 * bracket — the whole message, brackets and bars included, spoken aloud. The
 * positional mention repair can't see it: an arm that repeats the other inputs
 * (as a language whose verb agrees with the count must) leaves the mention
 * counts nowhere near each other, so it correctly declines to guess.
 *
 * Checked against the source rather than a field path so it works on the same
 * (source, translation) pair the other guards here take. `forms` is the target
 * locale's count, since that — not English's two — is how many arms it needs.
 *
 * Returns the offending input's name, or undefined when every branch survived.
 */
export function mismatchedPluralBranch(
    source: string,
    translation: string,
    forms: number,
): string | undefined {
    const expected = getPluralBranches(source);
    if (expected.length === 0) return undefined;
    const found = getPluralBranches(translation);
    for (const branch of expected) {
        const match = found.find((f) => f.name === branch.name);
        if (match === undefined || match.arms !== forms) return branch.name;
    }
    return undefined;
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
    let inDoc = false;
    for (const c of code) {
        if (close !== undefined) {
            if (!inInterp && c === close) close = undefined;
            else if (c === '\\') inInterp = !inInterp;
            continue;
        }
        // A `¶…¶` doc inside an example is prose, so an apostrophe in it is an
        // apostrophe, not a delimiter — the same reason this function looks only
        // inside code in the first place. Without this, every English doc example
        // with a possessive ("I'm documentation") reads as an unclosed literal.
        if (c === DOCS_SYMBOL) inDoc = !inDoc;
        else if (!inDoc && TextCloseByTextOpen[c] !== undefined)
            close = TextCloseByTextOpen[c];
    }
    return close !== undefined;
}

/**
 * Whether any `\code\` segment of this markup ends inside an open text literal.
 *
 * An apostrophe is a text delimiter only in *code* — in prose it's just an
 * apostrophe, so checking a whole string rejects every French, Italian, or
 * possessive-English sentence a translator writes with an ASCII `'`.
 *
 * External examples are skipped: `\py|print('less')\` is Python, where `'` is
 * that language's delimiter and closes nothing of ours. The `xx|` tag is the
 * same shape `isNonProgram` recognizes in `docExamples.ts` (inlined rather than
 * imported, since this module reaches the app bundle through
 * `db/projects/translationGuards.ts` and pulling in the doc parser would bloat
 * it).
 */
export function unclosedInCode(text: string): boolean {
    return splitMarkupAndCode(text).some(
        (segment) =>
            segment.kind === 'code' &&
            !/^[a-z]{2,3}\s*\|/.test(segment.text.replace(/^\\/, '').trim()) &&
            hasUnclosedText(segment.text),
    );
}

export const ConceptPattern = new RegExp(ConceptRegExPattern, 'ug');
export const MentionPattern = new RegExp(MentionRegEx, 'ug');

/** Delimiters for a masked concept link. Rare enough in prose that a
 *  translation is unlikely to contain them already, and visibly not a word, so
 *  a model leaves them alone rather than trying to render them. */
const LinkMaskOpen = '⟦';
const LinkMaskClose = '⟧';
/**
 * Recognize a placeholder the translation may have roughened up.
 *
 * A model rewriting a sentence into another script does not always hand the
 * placeholder back exactly: it can transliterate the digit into the target
 * script's numerals (`⟦೦⟧` in Kannada), pad it with spaces, or swap the
 * brackets for a look-alike. `\d` under `/u` matches only ASCII 0-9, so any of
 * those left the placeholder unmatched — the link was then dropped, or the raw
 * placeholder shipped into the locale file (seven of them are sitting in
 * gu-IN's tutorial). Only the unusual bracket forms are accepted: ASCII `[…]`
 * appears in real markup (`$value[true|false]`) and must never be eaten.
 */
const LinkMaskPattern = /[⟦〚【]\s*(\p{Nd}+)\s*[⟧〛】]/gu;

/** ASCII value of a Unicode decimal digit run. Decimal digits come in aligned
 *  blocks of ten, so walking down to the block's zero gives the value. */
function digitsToAscii(digits: string): string {
    let out = '';
    for (const character of digits) {
        const code = character.codePointAt(0) ?? 0;
        let zero = code;
        while (
            code - zero < 9 &&
            /\p{Nd}/u.test(String.fromCodePoint(zero - 1))
        )
            zero--;
        out += String(code - zero);
    }
    return out;
}

/** Whether any placeholder survived restoration — a restore that silently
 *  failed. Shipping one puts `⟦0⟧` in front of a reader, so the caller treats
 *  it as a failed translation rather than trusting the text. */
export function hasResidualLinkMask(text: string): boolean {
    return new RegExp(LinkMaskPattern.source, 'u').test(text);
}

/**
 * Replace every `@Concept` link with an indexed placeholder, returning the
 * masked text and the links in order.
 *
 * The system prompt already tells the model to keep `@Concept` verbatim, in
 * about as strong terms as English allows — and it translates them anyway
 * (`@Program` → `@Програм`). Instruction isn't enforcement, so this makes the
 * identifier untranslatable instead of asking nicely, the way
 * `splitMarkupAndCode` already does for `\code\` and Google's
 * `translate="no"` wrapping does for both.
 *
 * Masking in place, rather than splitting links out as their own segments,
 * keeps the sentence whole: a translator needs the link where it stands to
 * inflect the words around it. The index travels with the placeholder, so
 * grammar that reorders the sentence restores correctly anyway.
 */
export function protectConceptLinks(text: string): {
    masked: string;
    links: string[];
} {
    const links: string[] = [];
    const masked = text.replace(ConceptPattern, (link) => {
        links.push(link);
        return `${LinkMaskOpen}${links.length - 1}${LinkMaskClose}`;
    });
    return { masked, links };
}

/** Put the links back where their placeholders ended up. A placeholder the
 *  translation dropped simply doesn't appear; `mismatchedConceptLinks` is what
 *  notices and refuses the string. */
export function restoreConceptLinks(masked: string, links: string[]): string {
    return masked.replace(LinkMaskPattern, (placeholder, index: string) => {
        const link = links[Number(digitsToAscii(index))];
        return link ?? placeholder;
    });
}

/**
 * The first `@Concept` link whose presence differs between source and
 * translation, or undefined when they carry the same ones.
 *
 * The counterpart to `mismatchedDelimiter`, and used the same way: a
 * translation that renamed or dropped a link is broken output rather than a
 * stylistic choice, so the caller keeps the source unwritten instead of
 * shipping a link that resolves to nothing. Compares multisets, so a repeated
 * link has to stay repeated.
 */
export function mismatchedConceptLinks(
    source: string,
    translation: string,
): string | undefined {
    const tally = (text: string) => {
        const counts = new Map<string, number>();
        for (const [link] of text.matchAll(ConceptPattern))
            counts.set(link, (counts.get(link) ?? 0) + 1);
        return counts;
    };
    const before = tally(source);
    const after = tally(translation);
    for (const [link, count] of before)
        if (after.get(link) !== count) return link;
    for (const [link] of after) if (!before.has(link)) return link;
    return undefined;
}

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

    // The links the translation actually lost, in source order — the only ones
    // that can need restoring. Drawing from the whole source list instead paired
    // an unrecognized link with whatever happened to come first: a doc whose
    // example localized `@Phrase` to the locale's own name had that name
    // rewritten to `@Doc`, the first link in the source, giving three `@Doc`
    // where the source had two. `mismatchedConceptLinks` then refused the string
    // and it re-queued on every run, forever.
    const afterTally = new Map<string, number>();
    for (const [text] of afterConceptLinks)
        afterTally.set(text, (afterTally.get(text) ?? 0) + 1);
    const missing = beforeConcepts.filter((link) => {
        const remaining = afterTally.get(link) ?? 0;
        if (remaining === 0) return true;
        afterTally.set(link, remaining - 1);
        return false;
    });
    const beforeSet = new Set(beforeConcepts);

    // Restore all concepts in the after string.
    const mapping = new Map<string, string>();
    for (let index = 0; index < afterConceptLinks.length; index++) {
        // Get the matching text and index.
        const afterText = afterConceptLinks[index][0];

        // Is the text in the list of before concepts? Assume it was preserved and keep it.
        if (beforeSet.has(afterText)) continue;

        // Otherwise take the next link the translation dropped, assuming order
        // was preserved (which it is not always, as grammar can reverse things).
        const beforeText = missing.shift() ?? mapping.get(afterText);

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
