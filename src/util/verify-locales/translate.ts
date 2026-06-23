import Translate from '@google-cloud/translate';
import type LanguageCode from '@locale/LanguageCode';
import type { RegionCode } from '@locale/Regions';
import { ConceptRegExPattern, MentionRegEx } from '@parser/Tokenizer';
import type Log from '@util/verify-locales/Log';

export const GoogleTranslate = new Translate.v2.Translate();

/** Pause for `ms` milliseconds. */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pull the HTTP `code`, Google `reason`, and `message` out of a Translate
 *  client error, without assuming its shape. */
function apiError(error: unknown): {
    code: number | undefined;
    reason: string | undefined;
    message: string | undefined;
} {
    if (typeof error !== 'object' || error === null)
        return { code: undefined, reason: undefined, message: undefined };
    const code =
        'code' in error && typeof error.code === 'number'
            ? error.code
            : undefined;
    const message =
        'message' in error && typeof error.message === 'string'
            ? error.message
            : undefined;
    let reason: string | undefined;
    if ('errors' in error && Array.isArray(error.errors))
        for (const item of error.errors)
            if (
                typeof item === 'object' &&
                item !== null &&
                'reason' in item &&
                typeof item.reason === 'string'
            ) {
                reason = item.reason;
                break;
            }
    return { code, reason, message };
}

/**
 * Whether a Translate client error is a rate-limit error worth retrying after a
 * backoff: HTTP 429, or a `userRateLimitExceeded` / `rateLimitExceeded` reason
 * (the per-100-seconds-per-user cap). A `dailyLimitExceeded` or billing/config
 * 403 is NOT retryable — backoff can't fix it — so those fall through to fail.
 */
function isRateLimitError(error: unknown): boolean {
    const { code, reason } = apiError(error);
    if (code === 429) return true;
    return /^(user)?rateLimitExceeded$/i.test(reason ?? '');
}

/** A one-line, human-readable diagnosis of a Translate error, with a hint on how
 *  to proceed — so a failed run says WHY (rate vs daily cap vs billing/config)
 *  instead of dumping a raw error object. */
export function describeApiError(error: unknown): string {
    const { code, reason, message } = apiError(error);
    const hint = /dailyLimitExceeded/i.test(reason ?? '')
        ? 'daily character cap hit — wait for the reset (midnight US Pacific) or raise the "characters per day" quota'
        : /^(user)?rateLimitExceeded$/i.test(reason ?? '')
          ? 'per-user rate limit — even after backoff; lower concurrency or raise the "per 100 seconds per user" quota'
          : /SERVICE_DISABLED|accessNotConfigured/i.test(reason ?? '')
            ? 'the Cloud Translation API is not enabled for this project'
            : /billing/i.test(`${reason ?? ''} ${message ?? ''}`)
              ? 'billing is not enabled on the project (free tier is tiny and 403s quickly)'
              : /PERMISSION_DENIED|forbidden/i.test(`${reason ?? ''} ${message ?? ''}`)
                ? "the credentials lack permission, or aren't the project you raised the quota on"
                : undefined;
    const summary = [
        code !== undefined ? `HTTP ${code}` : undefined,
        reason,
        message,
    ]
        .filter(Boolean)
        .join(' — ');
    return `${summary || String(error)}${hint ? `\n     → ${hint}` : ''}`;
}

/** Proactive pacing between batches to stay under the per-user rate limit. */
const THROTTLE_MS = 250;
/** Exponential backoff on rate-limit errors: 2s, 4s, 8s, … with jitter. */
const MAX_RETRIES = 6;
const BASE_BACKOFF_MS = 2000;

/**
 * Translate one batch, self-pacing under Google's per-user rate limit: on a
 * rate-limit error, wait with exponential backoff and retry (rather than
 * aborting the whole locale). Non-rate-limit errors propagate immediately.
 */
async function translateBatch(
    log: Log,
    wrapped: string[],
    options: { from: string; to: string; format: 'html' },
): Promise<string[]> {
    for (let attempt = 0; ; attempt++) {
        try {
            const [translated] = await GoogleTranslate.translate(
                wrapped,
                options,
            );
            return translated;
        } catch (error) {
            if (!isRateLimitError(error) || attempt >= MAX_RETRIES) throw error;
            const delay =
                BASE_BACKOFF_MS * 2 ** attempt +
                Math.floor(Math.random() * 500);
            log.warning(
                2,
                `Rate limited (${apiError(error).reason ?? 'rateLimitExceeded'}); waiting ${Math.round(
                    delay / 1000,
                )}s before retry ${attempt + 1}/${MAX_RETRIES}…`,
            );
            await sleep(delay);
        }
    }
}

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
    for (const [index, batch] of sourceStringsBatches.entries()) {
        try {
            // Wrap every `\…\` code block, `@Concept` link, and `$name`
            // mention in a no-translate span before sending. Translate
            // guarantees verbatim preservation of nodes marked
            // `translate="no"`, which keeps Google from transliterating
            // `$expected` to `$المتوقع`, dropping `\` delimiters around
            // examples, agglutinating suffixes onto concept names (Romanian
            // `@Program-urile`, Bengali `@Doc-এ`), or otherwise garbling
            // Wordplay-specific syntax. We strip the wrappers after.
            const wrapped = batch.map(wrapProtected);
            // Pace requests to stay under the per-user rate limit (skip the
            // first batch so a single-batch locale has no added delay).
            if (index > 0) await sleep(THROTTLE_MS);
            const translatedBatch = await translateBatch(log, wrapped, {
                from: sourceLocale,
                to: targetLocale,
                format: 'html',
            });
            const restored = translatedBatch
                .map(unwrapProtected)
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
                )
                // Final safety net: Google can REORDER protected `\…\` spans
                // (especially in RTL locales like he/ar), orphaning a `\` and
                // leaving an unclosed example that breaks markup tokenization
                // (e.g. trailing `@` links read as invalid tokens). Source
                // strings always balance their `\`, so an odd count means the
                // markup is broken — keep the source rather than emit it.
                .map((translation, index) =>
                    preserveBalancedDelimiters(
                        log,
                        batch[index],
                        translation,
                        targetLocale,
                    ),
                );
            translations = [...translations, ...restored];
            log.good(
                2,
                `Translated ${batch.length} strings from ${sourceLocale} to ${targetLocale} ...`,
            );
        } catch (error) {
            // Say WHY in one line (rate vs daily cap vs billing/config) so the
            // failure is diagnosable at a glance; keep the raw dump below it.
            log.bad(
                2,
                `Translation stopped (${sourceLocale}→${targetLocale}): ${describeApiError(error)}`,
            );
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
function splitMarkupAndCode(
    text: string,
): Array<{ kind: 'markup' | 'code'; text: string }> {
    const segments: Array<{ kind: 'markup' | 'code'; text: string }> = [];
    let buffer = '';
    let inCode = false;
    for (const c of text) {
        if (c === '\\') {
            if (inCode) {
                segments.push({ kind: 'code', text: '\\' + buffer + '\\' });
                buffer = '';
                inCode = false;
            } else {
                if (buffer.length > 0)
                    segments.push({ kind: 'markup', text: buffer });
                buffer = '';
                inCode = true;
            }
        } else {
            buffer += c;
        }
    }
    if (buffer.length > 0 || inCode) {
        segments.push({
            kind: inCode ? 'code' : 'markup',
            text: inCode ? '\\' + buffer : buffer,
        });
    }
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
    const backslashes = (translation.match(/\\/g) ?? []).length;
    if (backslashes % 2 === 0) return translation;
    log.warning(
        2,
        `Kept the source for a string Google left with an unclosed \\…\\ delimiter in ${targetLocale}.`,
    );
    return source;
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
