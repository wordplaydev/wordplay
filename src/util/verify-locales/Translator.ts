import type LanguageCode from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
import type { RegionCode } from '@locale/Regions';
import type Log from '@util/verify-locales/Log';

/** Marker for the machine-readable usage line a child run prints on stdout so
 *  the parallel batch runner can sum usage across locales without scraping the
 *  human-readable summary. */
export const UsageLineMarker = '[translator-usage] ';

/** One human-readable line for a model's usage, e.g.
 *  "claude-sonnet-5: 412 requests, 1.2M in (94% cached), 310k out ≈ $3.87". */
export function describeUsage(usage: TranslatorUsage): string {
    const count = (n: number): string =>
        n >= 1_000_000
            ? `${(n / 1_000_000).toFixed(1)}M`
            : n >= 1_000
              ? `${Math.round(n / 1_000)}k`
              : `${n}`;
    const input =
        usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;
    const cached =
        input > 0 ? Math.round((usage.cacheReadTokens / input) * 100) : 0;
    const cost =
        usage.cost === undefined
            ? 'unknown $ (unpriced model)'
            : `$${usage.cost.toFixed(2)}`;
    const thinking =
        usage.thinkingTokens > 0
            ? ` (${count(usage.thinkingTokens)} thinking)`
            : '';
    return `${usage.model}: ${usage.requests} requests, ${count(input)} in (${cached}% cached), ${count(usage.outputTokens)} out${thinking} ≈ ${cost}`;
}

/** Whether a parsed JSON value is a usage entry, for reading the marker line
 *  back without an unsafe cast. */
export function isTranslatorUsage(value: unknown): value is TranslatorUsage {
    if (typeof value !== 'object' || value === null) return false;
    const entry: Record<string, unknown> = { ...value };
    return (
        typeof entry.model === 'string' &&
        typeof entry.requests === 'number' &&
        typeof entry.inputTokens === 'number' &&
        typeof entry.outputTokens === 'number' &&
        typeof entry.cacheReadTokens === 'number' &&
        typeof entry.cacheWriteTokens === 'number' &&
        typeof entry.thinkingTokens === 'number' &&
        (entry.cost === undefined || typeof entry.cost === 'number')
    );
}

/** Combine usage entries (e.g. from several locale runs) per model. The
 *  combined cost is the sum of the known costs, or undefined if none is known. */
export function sumUsage(entries: TranslatorUsage[]): TranslatorUsage[] {
    const byModel = new Map<string, TranslatorUsage>();
    for (const entry of entries) {
        const total = byModel.get(entry.model);
        if (total === undefined) byModel.set(entry.model, { ...entry });
        else {
            total.requests += entry.requests;
            total.inputTokens += entry.inputTokens;
            total.outputTokens += entry.outputTokens;
            total.cacheReadTokens += entry.cacheReadTokens;
            total.cacheWriteTokens += entry.cacheWriteTokens;
            total.thinkingTokens += entry.thinkingTokens;
            total.cost =
                total.cost === undefined && entry.cost === undefined
                    ? undefined
                    : (total.cost ?? 0) + (entry.cost ?? 0);
        }
    }
    return [...byModel.values()];
}

/** What one run of a backend consumed, per model, for cost reporting. */
export type TranslatorUsage = {
    /** The model the tokens were spent on. */
    model: string;
    /** Requests actually sent (retries and splits included). */
    requests: number;
    /** Uncached input tokens billed at the base input price. */
    inputTokens: number;
    /** Output tokens generated. */
    outputTokens: number;
    /** Input tokens read from the prompt cache (billed at 0.1× input). */
    cacheReadTokens: number;
    /** Input tokens written to the prompt cache (billed at 1.25× input). */
    cacheWriteTokens: number;
    /** The share of outputTokens the model spent thinking rather than
     *  answering. Billed as ordinary output, so it doesn't change the cost
     *  math — but a model that reasons at length about a routine translation
     *  is spend worth seeing, since it can erase a cheaper model's price
     *  advantage. */
    thinkingTokens: number;
    /** Estimated dollars at current published prices; undefined when the
     *  model's price isn't known, so a wrong estimate is never shown. */
    cost: number | undefined;
};

/**
 * A machine-translation backend. Implementations (Google v2, Claude, …) are
 * swappable behind this interface so the locale verifier, project translation,
 * and back-translation can share one contract and one fallback strategy.
 */
export default interface Translator {
    /** Stable identifier for logs and selection (e.g. 'google', 'claude'). */
    readonly id: string;

    /**
     * Translate `text` from `sourceLocale` to `targetLocale`, returning results
     * 1:1 in input order. A `null` element means that string could not be
     * translated (refusal, persistent failure, or a delimiter mismatch) — the
     * caller keeps the source and marks it unwritten (`$?`) rather than shipping
     * fake English. `undefined` is a hard failure that aborts the whole locale.
     * `targetText`, when given, provides the in-memory target locale (e.g. with a
     * freshly-translated glossary) so terms localize to the target word; without
     * it the backend may load the target from disk. Implementations must preserve
     * Wordplay syntax (`\code\`, `@Concept`, `$name`) — see `protect.ts`.
     * `options.names` marks the strings as identifier names, where a bad output
     * costs cross-locale name collisions rather than one awkward sentence — a
     * backend may route those to a stronger model.
     * `options.glossary` marks the strings as the glossary terms themselves, so a
     * backend can tell the model to translate each in the sense its definition
     * gives rather than the commonest sense of the bare English word.
     */
    translate(
        log: Log,
        text: string[],
        sourceLocale: string,
        targetLocale: string,
        targetText?: LocaleText,
        options?: { names?: boolean; glossary?: boolean },
    ): Promise<(string | null)[] | undefined>;

    /** What this instance has consumed so far, per model, for end-of-run cost
     *  reporting. Optional: backends without token accounting (Google) omit it. */
    getUsage?(): TranslatorUsage[];

    /** Map a Wordplay language + regions to this backend's target locale code. */
    getTargetLocale(
        language: LanguageCode,
        regions: RegionCode[],
    ): Promise<string>;

    /**
     * The subset of Wordplay's offered target locales this backend can
     * translate into. Google reports its enumerated set; Claude has no
     * enumeration endpoint and covers the full offered list.
     */
    getSupportedLocales(): Promise<Locale[]>;
}
