/**
 * The seasons Wordplay can dress itself in (#108). A flat list rather than one
 * set per climate: climate decides *which* of these a place has and *when*
 * (see resolveSeason.ts), but a temperate winter and a continental winter are
 * the same palette, differing only in their typical conditions.
 *
 * This module imports nothing, so the preload path and settings can name a
 * season without reaching palettes, elements, or the zone table.
 */
export const Seasons = [
    'wet',
    'dry',
    'hot',
    'cool',
    'spring',
    'summer',
    'autumn',
    'winter',
    'polarDay',
    'polarNight',
] as const;

export type Season = (typeof Seasons)[number];

/** The most likely weather for a place in a month — climatological, never a
 *  forecast. Conditions change which elements appear, never the palette, so
 *  contrast stays a fact about a season alone. */
export const Conditions = [
    'clear',
    'cloud',
    'rain',
    'snow',
    'wind',
    'haze',
] as const;

export type Condition = (typeof Conditions)[number];

/** The Köppen-Geiger climate groups, which decide which seasons occur. */
export const ClimateGroups = ['A', 'B', 'C', 'D', 'E'] as const;

export type ClimateGroup = (typeof ClimateGroups)[number];

/** Which seasons each climate group cycles through. */
export const SeasonsOf: Record<ClimateGroup, readonly Season[]> = {
    A: ['wet', 'dry'],
    B: ['hot', 'cool'],
    C: ['spring', 'summer', 'autumn', 'winter'],
    D: ['spring', 'summer', 'autumn', 'winter'],
    E: ['polarDay', 'polarNight'],
};

/** A text-presentation symbol for each season, for pickers and labels. */
export const SeasonSymbols: Record<Season, string> = {
    wet: '☂',
    dry: 'ʬ',
    hot: '☼',
    cool: '☾',
    spring: '✿',
    summer: '☀',
    autumn: '❦',
    winter: '❄',
    polarDay: '◠',
    polarNight: '✦',
};

/** What the season setting may hold: follow the place, opt out, or a choice. */
export type SeasonChoice = 'auto' | 'none' | Season;

export function isSeason(value: unknown): value is Season {
    return Seasons.some((season) => season === value);
}

export function isCondition(value: unknown): value is Condition {
    return Conditions.some((condition) => condition === value);
}

export function isSeasonChoice(value: unknown): value is SeasonChoice {
    return value === 'auto' || value === 'none' || isSeason(value);
}

/** The season being shown on this device and, under Auto, why. */
export type SeasonShown = {
    season: Season;
    /** The typical condition for this place and month; undefined when chosen. */
    condition: Condition | undefined;
    /** The device zone's country code, for regional easter eggs. */
    region: string | undefined;
    /** The Köppen-Geiger class of the device's zone, when Auto decided. */
    koppen: string | undefined;
    auto: boolean;
};
