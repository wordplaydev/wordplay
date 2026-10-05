/**
 * Fetches the climate normals Auto season resolution is derived from (#108),
 * into scripts/seasons/normals.json. Run rarely, by hand — the output is
 * committed, so building and testing never touch the network:
 *
 *   npx tsx scripts/seasons/fetchNormals.ts
 *
 * Zones and their coordinates come from the IANA tz database's zone.tab at a
 * pinned release (one row per country and zone, so every zone knows its
 * country), and each zone's monthly normals from NASA POWER's climatology API
 * at that zone's representative coordinate (2001–2020, 0.5°). NASA POWER data
 * is free to use with attribution, recorded in the output's `source`.
 */
import { existsSync, readFileSync } from 'fs';
import { writeFormatted } from './writeJSON.ts';
import {
    MonthKeys,
    NormalsPath,
    NormalsParameters,
    TzRelease,
    type Normals,
    type NormalsFile,
    type ZoneRow,
    isNormalsFile,
} from './normals.ts';

const TzBase = `https://raw.githubusercontent.com/eggert/tz/${TzRelease}`;

/** zone.tab writes ±DDMM[SS]±DDDMM[SS]; convert to decimal degrees. */
function parseCoordinate(text: string): { lat: number; lon: number } {
    const match = text.match(/^([+-]\d{4,6})([+-]\d{5,7})$/);
    const lat = match?.[1];
    const lon = match?.[2];
    if (lat === undefined || lon === undefined)
        throw new Error(`Unreadable coordinate ${text}`);
    const degrees = (value: string, width: number) => {
        const sign = value.startsWith('-') ? -1 : 1;
        const digits = value.slice(1);
        const d = Number(digits.slice(0, width));
        const m = Number(digits.slice(width, width + 2));
        const s = Number(digits.slice(width + 2) || '0');
        return sign * (d + m / 60 + s / 3600);
    };
    return { lat: degrees(lat, 2), lon: degrees(lon, 3) };
}

async function fetchText(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response.text();
}

async function readZones(): Promise<ZoneRow[]> {
    const rows: ZoneRow[] = [];
    for (const line of (await fetchText(`${TzBase}/zone.tab`)).split('\n')) {
        if (line.startsWith('#') || line.trim() === '') continue;
        const [country, coordinate, zone] = line.split('\t');
        if (
            country === undefined ||
            coordinate === undefined ||
            zone === undefined
        )
            continue;
        rows.push({ zone, country, ...parseCoordinate(coordinate) });
    }
    return rows;
}

/** Legacy names browsers still report (Asia/Calcutta) → their zone. */
async function readAliases(): Promise<Record<string, string>> {
    const aliases: Record<string, string> = {};
    for (const line of (await fetchText(`${TzBase}/backward`)).split('\n')) {
        const [kind, target, alias] = line.split(/\s+/);
        if (kind === 'Link' && target !== undefined && alias !== undefined)
            aliases[alias] = target;
    }
    return aliases;
}

function isNormals(value: unknown): value is Normals {
    if (typeof value !== 'object' || value === null) return false;
    return NormalsParameters.every((parameter) => {
        const series: unknown = Reflect.get(value, parameter);
        return (
            typeof series === 'object' &&
            series !== null &&
            MonthKeys.every(
                (month) => typeof Reflect.get(series, month) === 'number',
            )
        );
    });
}

async function fetchNormals(lat: number, lon: number): Promise<Normals> {
    const url =
        'https://power.larc.nasa.gov/api/temporal/climatology/point' +
        `?parameters=${NormalsParameters.join(',')}&community=RE` +
        `&latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&format=JSON`;
    for (let attempt = 0; ; attempt++) {
        try {
            const json: unknown = JSON.parse(await fetchText(url));
            const parameters =
                typeof json === 'object' && json !== null
                    ? Reflect.get(
                          Reflect.get(json, 'properties') ?? {},
                          'parameter',
                      )
                    : undefined;
            if (!isNormals(parameters)) throw new Error('unexpected shape');
            return parameters;
        } catch (error) {
            if (attempt >= 3) throw error;
            await new Promise((resolve) =>
                setTimeout(resolve, 2000 * (attempt + 1)),
            );
        }
    }
}

const stored: unknown = existsSync(NormalsPath)
    ? JSON.parse(readFileSync(NormalsPath, 'utf-8'))
    : undefined;
const previous = isNormalsFile(stored) ? stored : undefined;

const zones = await readZones();
const aliases = await readAliases();
const normals: NormalsFile['zones'] = {};
let index = 0;
for (const row of zones) {
    index++;
    // Resume: a zone fetched before at the same coordinate is kept.
    const kept = previous?.zones[row.zone];
    if (kept && kept.lat === row.lat && kept.lon === row.lon) {
        normals[row.zone] = kept;
        continue;
    }
    process.stdout.write(`${index}/${zones.length} ${row.zone}\n`);
    normals[row.zone] = {
        ...row,
        normals: await fetchNormals(row.lat, row.lon),
    };
    // Checkpoint, so an interrupted run resumes rather than starts over.
    if (index % 25 === 0)
        writeFormatted(NormalsPath, {
            source: sourceNote(),
            aliases,
            zones: normals,
        });
    await new Promise((resolve) => setTimeout(resolve, 250));
}

function sourceNote(): NormalsFile['source'] {
    return {
        zones: `IANA tz ${TzRelease} zone.tab and backward`,
        normals:
            'NASA POWER Climatology API v2, 2001–2020 monthly climatology. ' +
            'Data obtained from the NASA Langley Research Center POWER Project.',
        parameters: [...NormalsParameters],
    };
}

writeFormatted(NormalsPath, { source: sourceNote(), aliases, zones: normals });
console.log(`Wrote ${Object.keys(normals).length} zones to ${NormalsPath}`);
