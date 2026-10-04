/**
 * Turns a place's monthly climate normals into its Köppen-Geiger class and a
 * twelve-month calendar of seasons and typical conditions (#108). Pure, so the
 * generated zone table is a function of normals.json and nothing else, and the
 * rules can be tested on real places.
 */
import type { ClimateGroup, Condition, Season } from '#seasons/Season.ts';
import { MonthKeys, type Normals } from './normals.ts';

const DaysInMonth = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export type Climate = {
    /** The Köppen-Geiger class, e.g. `Aw`, `BWh`, `Cfb`, `Dfc`, `ET`. */
    koppen: string;
    group: ClimateGroup;
};

export type Month = { season: Season; condition: Condition };

function monthly(normals: Normals, parameter: keyof Normals): number[] {
    return MonthKeys.map((month) => normals[parameter][month]);
}

/** Monthly precipitation in mm per month. */
function precipitation(normals: Normals): number[] {
    return monthly(normals, 'PRECTOTCORR').map(
        (perDay, index) => perDay * (DaysInMonth[index] ?? 30),
    );
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/** The six months of a hemisphere's summer: April–September in the north. */
function summerMonths(lat: number): number[] {
    return lat >= 0 ? [3, 4, 5, 6, 7, 8] : [9, 10, 11, 0, 1, 2];
}

/**
 * Köppen-Geiger as Beck et al. (2018) state it: E when the warmest month is
 * under 10 °C, then B when annual precipitation is under ten times the dryness
 * threshold, then A, C, D by the coldest month.
 */
export function classify(normals: Normals, lat: number): Climate {
    const T = monthly(normals, 'T2M');
    const P = precipitation(normals);
    const MAT = sum(T) / 12;
    const MAP = sum(P);
    const Thot = Math.max(...T);
    const Tcold = Math.min(...T);
    const summer = summerMonths(lat);
    const isSummer = (index: number) => summer.includes(index);
    const Psummer = sum(P.filter((_, i) => isSummer(i)));
    const Pwinter = MAP - Psummer;
    const Pdry = Math.min(...P);
    const Psdry = Math.min(...P.filter((_, i) => isSummer(i)));
    const Pwdry = Math.min(...P.filter((_, i) => !isSummer(i)));
    const Pswet = Math.max(...P.filter((_, i) => isSummer(i)));
    const Pwwet = Math.max(...P.filter((_, i) => !isSummer(i)));
    // In mm, compared against ten times itself (Peel et al. 2007).
    const Pthreshold =
        Pwinter >= 0.7 * MAP
            ? 2 * MAT
            : Psummer >= 0.7 * MAP
              ? 2 * MAT + 28
              : 2 * MAT + 14;

    if (Thot < 10) return { koppen: Thot > 0 ? 'ET' : 'EF', group: 'E' };

    if (MAP < 10 * Pthreshold) {
        const kind = MAP < 5 * Pthreshold ? 'W' : 'S';
        return { koppen: `B${kind}${MAT >= 18 ? 'h' : 'k'}`, group: 'B' };
    }

    if (Tcold >= 18) {
        const kind =
            Pdry >= 60
                ? 'f'
                : Pdry >= 100 - MAP / 25
                  ? 'm'
                  : Psdry < Pwdry
                    ? 's'
                    : 'w';
        return { koppen: `A${kind}`, group: 'A' };
    }

    const dryness =
        Psdry < 40 && Psdry < Pwwet / 3 ? 's' : Pwdry < Pswet / 10 ? 'w' : 'f';
    const warmMonths = T.filter((t) => t >= 10).length;
    const heat =
        Thot >= 22 ? 'a' : warmMonths >= 4 ? 'b' : Tcold < -38 ? 'd' : 'c';
    const group: ClimateGroup = Tcold > 0 ? 'C' : 'D';
    return { koppen: `${group}${dryness}${heat}`, group };
}

/** A month whose mean is at least this, in °C, is hot. */
const HotMonth = 25;

/** Meteorological seasons, given the month already flipped for the south. */
function temperate(shifted: number): Season {
    return shifted <= 1 || shifted === 11
        ? 'winter'
        : shifted <= 4
          ? 'spring'
          : shifted <= 7
            ? 'summer'
            : 'autumn';
}

/** The month's season, by what decides seasons in that climate. */
function seasonOf(
    climate: Climate,
    month: number,
    lat: number,
    T: number[],
    P: number[],
): Season {
    // Meteorological seasons, flipped in the south.
    const shifted = lat >= 0 ? month : (month + 6) % 12;
    switch (climate.group) {
        // A month under 60 mm is a dry month, Köppen's own definition.
        case 'A':
            return (P[month] ?? 0) >= 60 ? 'wet' : 'dry';
        // A desert's year is hot and cool around the middle of its range.
        case 'B':
            // A monsoon steppe lives by its rains, as Cw climates do.
            if (climate.koppen === 'BSh' && (P[month] ?? 0) >= 100)
                return 'wet';
            // Hot is a temperature, not a rank: only a desert whose warmest
            // month is truly hot has a hot and cool year. A mild one (Los
            // Angeles, Denver, Madrid) keeps the temperate calendar, or a 19 °C
            // October would read as hot.
            if (Math.max(...T) >= HotMonth)
                return (T[month] ?? 0) >= HotMonth ? 'hot' : 'cool';
            return temperate(shifted);
        case 'C':
        case 'D':
            // Monsoon climates (dry winters, Cw/Dw) live by their rains, not
            // four temperate seasons: a month of 100 mm or more is the wet.
            if (climate.koppen.charAt(1) === 'w' && (P[month] ?? 0) >= 100)
                return 'wet';
            return temperate(shifted);
        // The sun's half of the polar year, April–September in the north.
        case 'E':
            return shifted >= 3 && shifted <= 8 ? 'polarDay' : 'polarNight';
    }
}

/** The month's most likely weather, most distinctive first. */
function conditionOf(normals: Normals, month: number): Condition {
    const key = MonthKeys[month] ?? 'JAN';
    const rain = normals.PRECTOTCORR[key];
    const snow = normals.PRECSNOLAND[key];
    if (snow >= 0.5 && snow >= rain * 0.4) return 'snow';
    if (rain >= 3.5) return 'rain';
    if (normals.AOD_55[key] >= 0.5 && rain < 1) return 'haze';
    if (normals.WS10M[key] >= 6.5) return 'wind';
    if (normals.CLOUD_AMT[key] >= 65) return 'cloud';
    return 'clear';
}

export function calendar(normals: Normals, lat: number): Month[] {
    const climate = classify(normals, lat);
    const T = monthly(normals, 'T2M');
    const P = precipitation(normals);
    return MonthKeys.map((_, month) => ({
        season: seasonOf(climate, month, lat, T, P),
        condition: conditionOf(normals, month),
    }));
}
