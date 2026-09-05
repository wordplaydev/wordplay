// Generate each region's name in its own language, so a locale tag can be
// written the way the people there write it — `/es-México`, not just `/es-MX`
// (#1220) — and so the locale chooser can show "México" beside "español"
// instead of the English "Mexico".
//
// Regions.ts stays hand-authored: it is the ISO 3166 code list that anchors
// `RegionCode`, and its `en` values are deliberately tuned (GB is "UK", US is
// "USA"). This script only adds names alongside it, in the same pinned-CLDR,
// byte-identical-on-every-machine way as generateDateTimes.ts and
// generateExemplars.ts.
//
// Picking the language to name a region in: CLDR's territoryInfo lists each
// territory's languages with a population share and sometimes an official
// status. Ranking by share alone picks English for Belgium, Ethiopia, and
// South Africa, because the shares count second-language speakers — so
// official languages come first, ranked among themselves by share, and the
// unfiltered ranking is only a fallback for territories CLDR marks none for.
// `de_facto_official` counts as official: it is how CLDR records Mexico's
// Spanish and the USA's English, neither of which is official by statute.
//
// Run with `npm run regions`. The artifact is src/locale/regionNames.generated.ts.
import path from 'path';
import { RegionCodes, Regions } from '@locale/Regions';
import {
    CLDR_VERSION,
    at,
    fetchCLDR,
    isRecord,
} from '@util/verify-locales/cldr';
import Log from '@util/verify-locales/Log';
import writeFormatted from '@util/verify-locales/writeFormatted';

/** This script's feedback, shaped like the rest of the locale tooling. */
const log: Log = new Log(false);

/** A territory's language as CLDR ranks it: its share of the population and
 *  whether it is official there. */
export type RegionLanguage = {
    id: string;
    percent: number;
    official: boolean;
};

/** CLDR marks a language official two ways, and both count: `de_facto_official`
 *  is how it records a national language with no statute behind it. The
 *  `official_regional` status deliberately does not count — a language official
 *  in one province does not name the whole country. */
function isOfficial(status: unknown): boolean {
    return status === 'official' || status === 'de_facto_official';
}

/** A territory's languages, official ones first, each group ranked by
 *  population share. Ties break by id so the output never depends on CLDR's
 *  key order. `und` is CLDR's "unknown language" placeholder, not a language. */
export function rankRegionLanguages(population: unknown): RegionLanguage[] {
    if (!isRecord(population)) return [];
    const languages: RegionLanguage[] = [];
    for (const [id, value] of Object.entries(population)) {
        if (id === 'und' || !isRecord(value)) continue;
        const percent = Number(value['_populationPercent']);
        if (Number.isNaN(percent)) continue;
        languages.push({
            id,
            percent,
            official: isOfficial(value['_officialStatus']),
        });
    }
    languages.sort(
        (a, b) =>
            Number(b.official) - Number(a.official) ||
            b.percent - a.percent ||
            a.id.localeCompare(b.id),
    );
    return languages;
}

/** The territory names CLDR publishes in one language, keyed by region code.
 *  Undefined when CLDR has no data for that language at all. */
async function getTerritories(
    id: string,
): Promise<Record<string, unknown> | undefined> {
    // CLDR XML ids join with '_'; the JSON repository's directories use '-'.
    const directory = id.replaceAll('_', '-');
    const json = await fetchCLDR(
        `cldr-localenames-full/main/${directory}/territories.json`,
    );
    const territories = at(
        json,
        'main',
        directory,
        'localeDisplayNames',
        'territories',
    );
    return isRecord(territories) ? territories : undefined;
}

function text(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export async function generateRegionNames(): Promise<void> {
    const info = at(
        await fetchCLDR('cldr-core/supplemental/territoryInfo.json'),
        'supplemental',
        'territoryInfo',
    );
    if (!isRecord(info))
        throw new Error('No territoryInfo in CLDR; refusing to write.');

    const english = await getTerritories('en');
    if (english === undefined)
        throw new Error('No English territories in CLDR; refusing to write.');

    const entries: string[] = [];
    for (const code of RegionCodes.toSorted()) {
        const ranked = rankRegionLanguages(
            at(info[code], 'languagePopulation'),
        );

        // Walk the ranked languages and take the first CLDR can actually name
        // the territory in; several top picks (Guaraní for Paraguay, Samoan for
        // Samoa) have no CLDR data at all.
        let name: string | undefined;
        let language: string | undefined;
        for (const candidate of ranked) {
            const territories = await getTerritories(candidate.id);
            name = text(territories?.[code]);
            if (name !== undefined) {
                language = candidate.id;
                break;
            }
        }
        if (name === undefined) {
            name = text(english[code]) ?? Regions[code].en;
            language = 'en';
            log.warning(`No endonym for ${code}; using the English name.`);
        }

        // CLDR's English names are better aliases than ISO's inverted forms
        // ("Bolivia", not "Bolivia, Plurinational State of"), and its alternates
        // are the names people actually type ("UK", "Ivory Coast").
        const en = text(english[code]) ?? Regions[code].en;
        const alt = [
            text(english[`${code}-alt-short`]),
            text(english[`${code}-alt-variant`]),
        ].filter((a): a is string => a !== undefined);

        entries.push(
            `    ${code}: ${JSON.stringify({ name, language, en, ...(alt.length > 0 ? { alt } : {}) })},`,
        );
    }

    if (
        !entries.some(
            (entry) => entry.startsWith('    MX:') && entry.includes('México'),
        )
    )
        throw new Error('Mexico is not named México; refusing to write.');

    const file = path.join(
        process.cwd(),
        'src',
        'locale',
        'regionNames.generated.ts',
    );
    const wrote = await writeFormatted(
        file,
        `// Generated by \`npm run regions\` from CLDR ${CLDR_VERSION}. Do not edit by hand.
// See src/util/verify-locales/generateRegionNames.ts for how each region's
// naming language is chosen.
import type { RegionCode } from '@locale/Regions';

export type RegionNameData = {
    /** The region's name in the language most spoken there, e.g. MX → "México". */
    name: string;
    /** The CLDR language \`name\` came from, so the choice can be reviewed. */
    language: string;
    /** CLDR's English name, which is more natural than ISO's inverted form
     *  ("Bolivia", not "Bolivia, Plurinational State of"). */
    en: string;
    /** CLDR's alternate English names, when it has any: "UK", "Ivory Coast". */
    alt?: string[];
};

/** The CLDR release these names came from. Checked against cldr.ts's pin. */
export const RegionNamesCLDR = '${CLDR_VERSION}';

/** Every ISO 3166 region in Regions.ts, named in its own language. */
export const RegionNames: Record<RegionCode, RegionNameData> = {
${entries.join('\n')}
};
`,
        true,
        log,
    );
    log.good(
        `${wrote ? 'Wrote' : 'No changes to'} ${file} (${entries.length} regions).`,
    );
}

// Only run when executed directly, so tests can import the ranking rule.
if (process.argv[1]?.endsWith('generateRegionNames.ts')) generateRegionNames();
