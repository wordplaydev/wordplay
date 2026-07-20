import { getDateTimeDataForLocale } from '@locale/dateTimeData';
import type Locale from '@locale/Locale';
import timezones from '@locale/timezones.json';
import levenshtein from '@util/levenshtein';

/**
 * The canonical IANA time zone identifiers Moment and Now accept, committed
 * from the pinned CLDR release by `npm run datetimes` (src/locale/timezones.json),
 * plus city-name-based suggestions so creators can type a city they know
 * ('tokyo', 'Tokio') and be offered the matching zone ('Asia/Tokyo').
 */

function isZoneList(value: unknown): value is { zones: string[] } {
    return (
        typeof value === 'object' &&
        value !== null &&
        'zones' in value &&
        Array.isArray(value.zones)
    );
}

export const SupportedTimeZones: readonly string[] = isZoneList(timezones)
    ? timezones.zones
    : [];

const supported = new Set(SupportedTimeZones);

export function isSupportedTimeZone(text: string): boolean {
    return supported.has(text);
}

/** The city implied by a zone id: its last segment, underscores as spaces
 *  (e.g. 'America/New_York' → 'New York'). CLDR's English exemplar cities are
 *  almost all exactly this, so it doubles as the English fallback. */
export function cityFromID(zone: string): string {
    const segments = zone.split('/');
    return segments[segments.length - 1].replaceAll('_', ' ');
}

/** The zone's city name in the given locale, when its data is loaded (full
 *  datetimes files carry CLDR exemplar cities), else derived from the id. */
export function cityOf(zone: string, locale: Locale): string {
    return getDateTimeDataForLocale(locale).zones?.[zone] ?? cityFromID(zone);
}

/** How many edits separate the input from a zone's best-matching name, where
 *  an exact match is 0, containment (for inputs of 3+ characters) counts as 1,
 *  and anything else is its edit distance plus 1. */
function scoreZone(
    normalized: string,
    zone: string,
    locales: Locale[],
    maximumDistance: number,
): number {
    const candidates = [
        zone.toLowerCase(),
        cityFromID(zone).toLowerCase(),
        ...locales.map((locale) => cityOf(zone, locale).toLowerCase()),
    ];
    let best = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
        if (candidate === normalized) return 0;
        const score =
            normalized.length >= 3 && candidate.includes(normalized)
                ? 1
                : levenshtein(candidate, normalized, maximumDistance) + 1;
        if (score < best) best = score;
    }
    return best;
}

const MaximumSuggestions = 3;

/** The loosest edit distance that still counts as "did you mean" for an input
 *  of this length: a third of its characters, at least one, at most three —
 *  so a five-letter city like "tokyo" doesn't drag in every zone within three
 *  edits ("tomsk", "oslo"). */
function maximumDistanceFor(input: string): number {
    return Math.min(3, Math.max(1, Math.floor(input.length / 3)));
}

/**
 * Zones whose id or city name (in English or any of the given locales)
 * resembles the input, best first, at most three. When any zone matches
 * exactly (or by containment), weaker edit-distance matches are dropped —
 * a confident match shouldn't be diluted by lookalikes. Deterministic: ties
 * break by zone id, so the same input always yields the same suggestions.
 */
export function suggestTimeZones(
    input: string,
    locales: Locale[],
): { zone: string; city: string }[] {
    const normalized = input.trim().toLowerCase().replaceAll('_', ' ');
    if (normalized === '') return [];
    const maximumDistance = maximumDistanceFor(normalized);
    const scored: { zone: string; score: number }[] = [];
    for (const zone of SupportedTimeZones) {
        const score = scoreZone(normalized, zone, locales, maximumDistance);
        if (score <= maximumDistance + 1) scored.push({ zone, score });
    }
    scored.sort(
        (a, b) => a.score - b.score || a.zone.localeCompare(b.zone, 'en'),
    );
    const best = scored[0]?.score;
    return scored
        .filter(({ score }) => (best <= 1 ? score <= 1 : true))
        .slice(0, MaximumSuggestions)
        .map(({ zone }) => ({
            zone,
            city:
                locales.length > 0
                    ? cityOf(zone, locales[0])
                    : cityFromID(zone),
        }));
}
