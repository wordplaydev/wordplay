import type LanguageCode from '@locale/LanguageCode';
import { getCLDRCandidates } from '@locale/LanguageCode';

/**
 * Per-language character data: the letters and digits used to write each
 * language, in lower and upper case, keyed by CLDR locale id (e.g. `en`,
 * `zh_Hant`). Derived from CLDR "exemplar characters" — CLDR's curated list
 * of the orthographic units of each language's standard orthography — by
 * src/util/verify-locales/generateExemplars.ts, which documents exactly what
 * is included. Entries are orthographic units: usually a single character,
 * sometimes a digraph the orthography treats as one (Slovak `ch`).
 *
 * Like the codepoint database (Unicode.ts), the data is fetched lazily the
 * first time something needs it. An unreachable file degrades to an empty
 * map, so consumers fall back rather than fail.
 */
let exemplars: Promise<Map<string, string[]>> | undefined = undefined;

export function getExemplars(): Promise<Map<string, string[]>> {
    if (exemplars === undefined)
        exemplars = fetch('/unicode/exemplars.json')
            .then((response) => response.json())
            .then((json: unknown) => {
                const map = new Map<string, string[]>();
                if (
                    json !== null &&
                    typeof json === 'object' &&
                    'locales' in json &&
                    json.locales !== null &&
                    typeof json.locales === 'object'
                )
                    for (const [id, joined] of Object.entries(json.locales))
                        if (typeof joined === 'string')
                            // Members are space-joined; a member never
                            // contains a space.
                            map.set(id, joined.split(' '));
                return map;
            })
            .catch(() => new Map<string, string[]>());
    return exemplars;
}

/**
 * Resolve a language and optional region to its characters in the given
 * dataset, trying region-specific variants first (the same CLDR candidate
 * chain the emoji names use, so e.g. Chinese in TW resolves to the
 * Traditional Chinese characters). Pure, so tests can inject data.
 */
export function resolveExemplars(
    all: Map<string, string[]>,
    language: LanguageCode,
    region: string | undefined,
): string[] | undefined {
    for (const candidate of getCLDRCandidates(language, region)) {
        const entry = all.get(candidate);
        if (entry !== undefined) return entry;
    }
    return undefined;
}

/**
 * The characters of one language, or undefined when CLDR has no exemplars
 * for it.
 */
export async function getLanguageExemplars(
    language: LanguageCode,
    region: string | undefined,
): Promise<string[] | undefined> {
    return resolveExemplars(await getExemplars(), language, region);
}
