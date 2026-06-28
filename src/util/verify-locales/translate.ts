import Translate from '@google-cloud/translate';
import type LanguageCode from '@locale/LanguageCode';
import type { RegionCode } from '@locale/Regions';
import type Log from '@util/verify-locales/Log';
import {
    ConceptPattern,
    decodeHtmlEntities,
    preserveBalancedDelimiters,
    repairMentionsPositional,
    restoreReferences,
    unwrapProtected,
    wrapProtected,
} from './protect';

// Re-export the backend-agnostic protection/repair helpers from their new home
// so existing importers (and translate.test.ts) keep working unchanged.
export {
    ConceptPattern,
    decodeHtmlEntities,
    MentionPattern,
    preserveBalancedDelimiters,
    repairMentionsPositional,
    restoreReferences,
    splitMarkupAndCode,
    unwrapMentions,
    unwrapProtected,
    wrapMentions,
    wrapProtected,
} from './protect';

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
 *  instead of dumping a raw error object.
 *
 *  Google-specific by design: it parses Google's error shape and quota hints.
 *  TODO (Phase 1): add a `describeClaudeError` for Anthropic's typed exceptions
 *  + `stop_details`, and consider a per-backend error-diagnosis method on the
 *  `Translator` interface so callers get backend-appropriate messages. */
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
              : /PERMISSION_DENIED|forbidden/i.test(
                      `${reason ?? ''} ${message ?? ''}`,
                  )
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
