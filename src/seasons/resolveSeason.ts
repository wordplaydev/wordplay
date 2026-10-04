import { isRegionCode, type RegionCode } from '#locale/Regions.ts';
import type { Condition, Season } from './Season.ts';
import { decodeCondition, decodeSeason } from './seasonCodes.ts';
import { ZoneAliases, ZoneSeasons } from './zoneSeasons.generated.ts';

/**
 * Where Auto lands for a device, and why (#108). Entirely local: the device's
 * IANA time zone names a place, the place has a climate, and the climate's
 * calendar says what season and typical conditions this month brings. Nothing
 * is sent anywhere. Loaded only by dynamic import — the zone table is the
 * largest thing a season needs and most pages never pay for it.
 */
export type Resolution = {
    season: Season;
    condition: Condition;
    /** The zone's country, for regional easter eggs. */
    region: RegionCode | undefined;
    /** The zone's Köppen-Geiger class, for saying why. */
    koppen: string;
    zone: string;
};

/** The season and conditions for a zone in the month containing `date`, or
 *  undefined for a zone the table doesn't know (UTC, Etc/*), so Auto falls
 *  back to no season rather than guessing. */
export function resolveSeason(
    date: Date,
    zone: string,
): Resolution | undefined {
    // A zone's own row first: tz links some zones with their own coordinates
    // (Addis Ababa → Nairobi) for timekeeping, not climate.
    const canonical = zone in ZoneSeasons ? zone : (ZoneAliases[zone] ?? zone);
    const entry = ZoneSeasons[canonical];
    if (entry === undefined) return undefined;
    const [country, koppen, months] = entry;
    const month = monthIn(date, canonical);
    const season = decodeSeason(months.charAt(month * 2));
    const condition = decodeCondition(months.charAt(month * 2 + 1));
    if (season === undefined || condition === undefined) return undefined;
    return {
        season,
        condition,
        region: isRegionCode(country) ? country : undefined,
        koppen,
        zone: canonical,
    };
}

/** The zero-based month it is in that zone, not where the code runs. */
function monthIn(date: Date, zone: string): number {
    try {
        const month = new Intl.DateTimeFormat('en-US', {
            month: 'numeric',
            timeZone: zone,
        }).format(date);
        return Number(month) - 1;
    } catch {
        return date.getMonth();
    }
}

/** The device's zone, or undefined when the platform won't say. */
export function getDeviceZone(): string | undefined {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        return undefined;
    }
}
