// Shared utilities for generation scripts that extract data from Unicode's
// CLDR (the Common Locale Data Repository): date/time formats
// (generateDateTimes.ts) and per-language exemplar characters
// (generateExemplars.ts). Everything is fetched from the published CLDR JSON
// at the single pinned release below, so generated artifacts are a pure
// function of that version and the extracting script — re-runs are
// byte-identical on every machine and change only on a deliberate version
// bump. (The emoji-name pipeline is separate by design: it tracks unpinned
// CLDR XML annotations.)
import { getCLDRCandidates } from '@locale/LanguageCode';
import { getLocaleLanguage, getLocaleRegions } from '@locale/LocaleText';

/** The pinned CLDR release all generated data is extracted from. Bumping this
 *  is the only way generated output changes; expect a large, reviewable diff.
 *  Verifiers check every committed artifact's `cldr` field against this. */
export const CLDR_VERSION = '48.0.0';

const CLDR_BASE = `https://raw.githubusercontent.com/unicode-org/cldr-json/${CLDR_VERSION}/cldr-json`;

// Per-process fetch cache. Promises are cached (not resolved values) so
// concurrent per-locale runs share one request per file; null records a 404.
const fetchCache = new Map<string, Promise<unknown>>();

export function fetchCLDR(relativePath: string): Promise<unknown> {
    const cached = fetchCache.get(relativePath);
    if (cached !== undefined) return cached;
    const url = `${CLDR_BASE}/${relativePath}`;
    const promise = (async () => {
        const response = await fetch(url);
        if (response.status === 404) return null;
        if (!response.ok)
            throw new Error(
                `${url}: ${response.status} ${response.statusText}`,
            );
        const json: unknown = await response.json();
        return json;
    })();
    // Drop failed fetches from the cache so a retry is possible.
    promise.catch(() => fetchCache.delete(relativePath));
    fetchCache.set(relativePath, promise);
    return promise;
}

/** The CLDR JSON locale directories to try for one of our locale names, in
 *  priority order (e.g. es-MX → ['es-MX', 'es']). CLDR XML candidates use '_';
 *  the JSON repository uses '-'. */
export function cldrDirectoriesFor(locale: string): string[] {
    const language = getLocaleLanguage(locale);
    if (language === undefined)
        throw new Error(`No language for locale ${locale}`);
    const region = getLocaleRegions(locale)[0];
    return getCLDRCandidates(language, region).map((candidate) =>
        candidate.replaceAll('_', '-'),
    );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Walk nested keys of untyped CLDR JSON. */
export function at(value: unknown, ...keys: string[]): unknown {
    let current = value;
    for (const key of keys) {
        if (!isRecord(current)) return undefined;
        current = current[key];
    }
    return current;
}

/** CLDR patterns are either strings or { _value, _numbers? } objects. */
export function patternText(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    const inner = at(value, '_value');
    return typeof inner === 'string' ? inner : undefined;
}
