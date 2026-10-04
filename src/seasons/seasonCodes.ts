import { Conditions, Seasons, type Condition, type Season } from './Season.ts';

/**
 * One letter per season and per condition, so a zone's twelve-month calendar
 * is a 24-character string in the generated zone table rather than an array of
 * objects — the table is loaded by every reader on Auto.
 */
export const SeasonCodes: Record<Season, string> = {
    wet: 'w',
    dry: 'd',
    hot: 'h',
    cool: 'c',
    spring: 's',
    summer: 'u',
    autumn: 'a',
    winter: 'i',
    polarDay: 'p',
    polarNight: 'n',
};

export const ConditionCodes: Record<Condition, string> = {
    clear: 'C',
    cloud: 'L',
    rain: 'R',
    snow: 'S',
    wind: 'W',
    haze: 'H',
};

export function decodeSeason(code: string): Season | undefined {
    return Seasons.find((season) => SeasonCodes[season] === code);
}

export function decodeCondition(code: string): Condition | undefined {
    return Conditions.find((condition) => ConditionCodes[condition] === code);
}
