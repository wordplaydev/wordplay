import type LanguageCode from '@locale/LanguageCode';
import type Locale from '@locale/Locale';
import type LocaleText from '@locale/LocaleText';
import type { RegionCode } from '@locale/Regions';
import type Log from '@util/verify-locales/Log';

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
     */
    translate(
        log: Log,
        text: string[],
        sourceLocale: string,
        targetLocale: string,
        targetText?: LocaleText,
    ): Promise<(string | null)[] | undefined>;

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
