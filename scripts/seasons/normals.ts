import { resolve } from 'path';

/** The pinned IANA tz release zones and aliases are read from. */
export const TzRelease = '2026a';

export const NormalsPath = resolve(import.meta.dirname, 'normals.json');

/**
 * NASA POWER climatology parameters: mean temperature (°C), precipitation and
 * snowfall (mm/day), cloud amount (%), 10 m wind speed (m/s), and aerosol
 * optical depth at 550 nm (dust and smoke: the harmattan's haze).
 */
export const NormalsParameters = [
    'T2M',
    'PRECTOTCORR',
    'PRECSNOLAND',
    'CLOUD_AMT',
    'WS10M',
    'AOD_55',
] as const;

export type NormalsParameter = (typeof NormalsParameters)[number];

export const MonthKeys = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
] as const;

export type MonthKey = (typeof MonthKeys)[number];

export type Normals = Record<NormalsParameter, Record<MonthKey, number>>;

export type ZoneRow = {
    zone: string;
    country: string;
    lat: number;
    lon: number;
};

export type NormalsFile = {
    source: { zones: string; normals: string; parameters: string[] };
    /** Legacy zone names → the zone they now name. */
    aliases: Record<string, string>;
    zones: Record<string, ZoneRow & { normals: Normals }>;
};

export function isNormalsFile(value: unknown): value is NormalsFile {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof Reflect.get(value, 'zones') === 'object' &&
        typeof Reflect.get(value, 'aliases') === 'object'
    );
}
