// Generate per-locale date/time formatting data for Moment's localized text
// conversion (see src/locale/dateTimeFormats.ts for why this exists: runtime
// Intl.DateTimeFormat output varies by browser/ICU, so formatting uses
// committed data).
//
// Generation itself is deliberately independent of the developer's Node/ICU:
// everything is extracted from Unicode's published CLDR JSON at the pinned
// release tag in cldr.ts (measured drift between adjacent CLDR releases changes
// about half of all locale×calendar outputs — era renames, hour-cycle flips —
// so extracting from the running engine would churn committed data whenever a
// developer's Node differed). Output is a pure function of CLDR_VERSION, this
// parser, and the package-locked temporal-polyfill (whose /full calendar math
// is pure JS), so re-runs are byte-identical on every machine and change only
// on a deliberate version bump.
//
// For each supported locale and calendar, this extracts:
// - the long-style date pattern (LDML, parsed into our part encoding),
// - month names in pattern context (format width), keyed by Temporal monthCode,
// - era names keyed by Temporal era code, when the pattern displays an era,
// - the medium-style time pattern, hour cycle, and day period names,
// - the locale's default calendar (from CLDR's calendar preference data).
//
// Chinese and Dangi month/day names are year-dependent (cyclic years, leap
// months), so those two calendars use the numeric short pattern instead — a
// documented fidelity limitation. Files are written Prettier-formatted so
// re-runs produce clean diffs.
//
// Run all supported locales (`npm run datetimes`) or one (`… <locale>`).
import { existsSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';
import { Temporal } from 'temporal-polyfill/full';
import {
    SupportedCalendars,
    isSupportedCalendar,
    type CalendarData,
    type DateTimeData,
    type DateTimePart,
    type SupportedCalendar,
} from '@locale/dateTimeFormats';
import { getLocaleRegions } from '@locale/LocaleText';
import { SupportedLocales } from '@locale/SupportedLocales';
import {
    at,
    cldrDirectoriesFor,
    CLDR_VERSION,
    fetchCLDR,
    isRecord,
    patternText,
} from '@util/verify-locales/cldr';
import writeFormatted from '@util/verify-locales/writeFormatted';

/** Where each calendar's CLDR data lives. `key` is the property name inside
 *  `dates.calendars`. iso8601 has no CLDR file; it reuses gregorian data. */
const CalendarSources: Record<
    Exclude<SupportedCalendar, 'iso8601'>,
    { pkg: string; file: string; key: string }
> = {
    gregory: {
        pkg: 'cldr-dates-full',
        file: 'ca-gregorian.json',
        key: 'gregorian',
    },
    buddhist: {
        pkg: 'cldr-cal-buddhist-full',
        file: 'ca-buddhist.json',
        key: 'buddhist',
    },
    chinese: {
        pkg: 'cldr-cal-chinese-full',
        file: 'ca-chinese.json',
        key: 'chinese',
    },
    coptic: {
        pkg: 'cldr-cal-coptic-full',
        file: 'ca-coptic.json',
        key: 'coptic',
    },
    dangi: { pkg: 'cldr-cal-dangi-full', file: 'ca-dangi.json', key: 'dangi' },
    ethioaa: {
        pkg: 'cldr-cal-ethiopic-full',
        file: 'ca-ethiopic-amete-alem.json',
        key: 'ethiopic-amete-alem',
    },
    ethiopic: {
        pkg: 'cldr-cal-ethiopic-full',
        file: 'ca-ethiopic.json',
        key: 'ethiopic',
    },
    hebrew: {
        pkg: 'cldr-cal-hebrew-full',
        file: 'ca-hebrew.json',
        key: 'hebrew',
    },
    indian: {
        pkg: 'cldr-cal-indian-full',
        file: 'ca-indian.json',
        key: 'indian',
    },
    'islamic-civil': {
        pkg: 'cldr-cal-islamic-full',
        file: 'ca-islamic-civil.json',
        key: 'islamic-civil',
    },
    'islamic-tbla': {
        pkg: 'cldr-cal-islamic-full',
        file: 'ca-islamic-tbla.json',
        key: 'islamic-tbla',
    },
    'islamic-umalqura': {
        pkg: 'cldr-cal-islamic-full',
        file: 'ca-islamic-umalqura.json',
        key: 'islamic-umalqura',
    },
    japanese: {
        pkg: 'cldr-cal-japanese-full',
        file: 'ca-japanese.json',
        key: 'japanese',
    },
    persian: {
        pkg: 'cldr-cal-persian-full',
        file: 'ca-persian.json',
        key: 'persian',
    },
    roc: { pkg: 'cldr-cal-roc-full', file: 'ca-roc.json', key: 'roc' },
};

/** CLDR era indices → Temporal era codes for the multi-era calendars whose
 *  patterns display eras. Japanese pre-Meiji eras aren't shipped (dates before
 *  1868 render the raw era code); single-era calendars are mapped dynamically
 *  from the polyfill's modern era code (see erasFor). */
const JapaneseEras: Record<string, string> = {
    '232': 'meiji',
    '233': 'taisho',
    '234': 'showa',
    '235': 'heisei',
    '236': 'reiwa',
};

/** CLDR calendar preference names → our calendar identifiers. */
const PreferenceAliases: Record<string, string> = {
    gregorian: 'gregory',
    'ethiopic-amete-alem': 'ethioaa',
};


/** Fetch a calendar's `dates.calendars.<key>` object for the first CLDR
 *  directory that has the file. */
async function loadCalendar(
    directories: string[],
    source: { pkg: string; file: string; key: string },
): Promise<unknown> {
    for (const dir of directories) {
        const json = await fetchCLDR(`${source.pkg}/main/${dir}/${source.file}`);
        if (json === null) continue;
        const data = at(json, 'main', dir, 'dates', 'calendars', source.key);
        if (data !== undefined) return data;
    }
    throw new Error(
        `No CLDR ${source.file} found for any of ${directories.join(', ')}`,
    );
}

/** What an LDML pattern parses into, beyond the parts themselves. */
type ParsedPattern = {
    parts: DateTimePart[];
    monthWidth: 'wide' | 'abbreviated' | 'narrow' | undefined;
    usesEra: boolean;
    usesDayPeriod: boolean;
    hourCycle: DateTimeData['hourCycle'] | undefined;
};

/**
 * Parse the subset of LDML date/time pattern syntax our part encoding models.
 * Symbols we deliberately drop: U (cyclic year names), E/e/c (weekdays — our
 * patterns don't render them). Anything else unexpected is dropped with a
 * warning so new CLDR syntax is noticed at generation time.
 */
function parseLDMLPattern(
    pattern: string,
    numericMonths: boolean,
): ParsedPattern {
    const parts: DateTimePart[] = [];
    let monthWidth: ParsedPattern['monthWidth'] = undefined;
    let usesEra = false;
    let usesDayPeriod = false;
    let hourCycle: ParsedPattern['hourCycle'] = undefined;

    const literal = (text: string) => {
        if (text === '') return;
        const last = parts[parts.length - 1];
        if (last && 'l' in last) last.l += text;
        else parts.push({ l: text });
    };
    const field = (f: DateTimePart & { f: unknown } extends never
        ? never
        : Extract<DateTimePart, { f: unknown }>['f'], padded: boolean) =>
        parts.push(padded ? { f, p: true } : { f });

    let i = 0;
    while (i < pattern.length) {
        const c = pattern[i];
        // Quoted literals; '' is a literal apostrophe.
        if (c === "'") {
            if (pattern[i + 1] === "'") {
                literal("'");
                i += 2;
                continue;
            }
            let text = '';
            i++;
            while (i < pattern.length) {
                if (pattern[i] === "'") {
                    if (pattern[i + 1] === "'") {
                        text += "'";
                        i += 2;
                    } else {
                        i++;
                        break;
                    }
                } else text += pattern[i++];
            }
            literal(text);
            continue;
        }
        // Symbol runs.
        if (/[a-zA-Z]/.test(c)) {
            let length = 1;
            while (pattern[i + length] === c) length++;
            const padded = length === 2;
            switch (c) {
                case 'y':
                    field('year', false);
                    break;
                case 'r':
                    field('relatedYear', false);
                    break;
                case 'U':
                case 'E':
                case 'e':
                case 'c':
                    // Cyclic year names and weekdays aren't modeled.
                    break;
                case 'G':
                    field('era', false);
                    usesEra = true;
                    break;
                case 'M':
                case 'L':
                    if (length >= 3 && !numericMonths) {
                        field('monthName', false);
                        monthWidth =
                            length === 3
                                ? 'abbreviated'
                                : length === 4
                                  ? 'wide'
                                  : 'narrow';
                    } else field('month', padded);
                    break;
                case 'd':
                    field('day', padded);
                    break;
                case 'h':
                case 'H':
                case 'K':
                case 'k':
                    field('hour', padded);
                    hourCycle =
                        c === 'h'
                            ? 'h12'
                            : c === 'H'
                              ? 'h23'
                              : c === 'K'
                                ? 'h11'
                                : 'h24';
                    break;
                case 'm':
                    field('minute', padded);
                    break;
                case 's':
                    field('second', padded);
                    break;
                case 'a':
                case 'b':
                case 'B':
                    field('dayPeriod', false);
                    usesDayPeriod = true;
                    break;
                default:
                    console.warn(
                        `Dropping unmodeled LDML symbol '${c.repeat(length)}' in '${pattern}'`,
                    );
            }
            i += length;
            continue;
        }
        // Bare literal run.
        let text = '';
        while (
            i < pattern.length &&
            pattern[i] !== "'" &&
            !/[a-zA-Z]/.test(pattern[i])
        )
            text += pattern[i++];
        literal(text);
    }
    return { parts, monthWidth, usesEra, usesDayPeriod, hourCycle };
}

/** Map a CLDR month key to a Temporal monthCode. Hebrew is the only calendar
 *  whose CLDR numbering differs: CLDR counts leap-year positions (6 = Adar I),
 *  while Temporal codes leap months with an L suffix (M05L) and keeps common
 *  numbering otherwise. The '7-yeartype-leap' name (Adar II) stays unused —
 *  monthCode M06 always renders the common-year name, a documented limitation. */
function monthCodeFor(
    calendar: SupportedCalendar,
    cldrKey: string,
): string | undefined {
    if (cldrKey.includes('-yeartype-')) return undefined;
    const n = Number(cldrKey);
    if (!Number.isInteger(n) || n < 1) return undefined;
    if (calendar === 'hebrew') {
        if (n <= 5) return `M0${n}`;
        if (n === 6) return 'M05L';
        return `M${String(n - 1).padStart(2, '0')}`;
    }
    return `M${String(n).padStart(2, '0')}`;
}

/** Extract the calendar's month names at the width the pattern uses, keyed by
 *  Temporal monthCode. */
function monthsFor(
    calendarData: unknown,
    width: 'wide' | 'abbreviated' | 'narrow',
    calendar: SupportedCalendar,
): Record<string, string> {
    const source = at(calendarData, 'months', 'format', width);
    if (!isRecord(source))
        throw new Error(`No format/${width} months for ${calendar}`);
    const months: Record<string, string> = {};
    for (const [key, value] of Object.entries(source)) {
        const code = monthCodeFor(calendar, key);
        const name = patternText(value);
        if (code !== undefined && name !== undefined) months[code] = name;
    }
    return months;
}

/** Extract era names keyed by Temporal era code. Japanese uses the committed
 *  index table; other calendars map the polyfill's modern era code to the
 *  highest-indexed CLDR era (the one shown for present-day dates). */
function erasFor(
    calendarData: unknown,
    calendar: SupportedCalendar,
): Record<string, string> {
    const abbr = at(calendarData, 'eras', 'eraAbbr');
    if (!isRecord(abbr)) throw new Error(`No eraAbbr for ${calendar}`);
    const eras: Record<string, string> = {};
    if (calendar === 'japanese') {
        for (const [index, code] of Object.entries(JapaneseEras)) {
            const name = patternText(abbr[index]);
            if (name !== undefined) eras[code] = name;
        }
    } else {
        const modernCode = Temporal.PlainDate.from('2026-06-08').withCalendar(
            calendar,
        ).era;
        const indices = Object.keys(abbr)
            .map(Number)
            .filter((n) => Number.isInteger(n));
        const highest = Math.max(...indices);
        const name = patternText(abbr[String(highest)]);
        if (modernCode !== undefined && name !== undefined)
            eras[modernCode] = name;
    }
    return eras;
}

/** Assert that every monthCode the polyfill produces for calendar years
 *  spanning ISO 2020–2027 (enough to include lunisolar leap months and
 *  epagomenal months) has a name — so key-mapping mistakes fail generation
 *  loudly instead of falling back to numbers at runtime. */
function validateMonthCoverage(
    calendar: SupportedCalendar,
    months: Record<string, string>,
): void {
    const start = Temporal.PlainDate.from('2020-01-15').withCalendar(calendar);
    const end = Temporal.PlainDate.from('2027-01-15').withCalendar(calendar);
    for (let year = start.year; year <= end.year; year++) {
        const monthsInYear = Temporal.PlainDate.from({
            calendar,
            year,
            month: 1,
            day: 1,
        }).monthsInYear;
        for (let month = 1; month <= monthsInYear; month++) {
            const code = Temporal.PlainDate.from({
                calendar,
                year,
                month,
                day: 1,
            }).monthCode;
            if (months[code] === undefined)
                throw new Error(
                    `No ${calendar} month name for monthCode ${code}`,
                );
        }
    }
}

async function generateCalendar(
    directories: string[],
    calendar: Exclude<SupportedCalendar, 'iso8601'>,
): Promise<CalendarData> {
    const calendarData = await loadCalendar(
        directories,
        CalendarSources[calendar],
    );
    // Chinese/Dangi month and day names vary by year; use the numeric short
    // pattern (their long patterns also carry cyclic year names we drop).
    const numericOverride = calendar === 'chinese' || calendar === 'dangi';
    const pattern = patternText(
        at(calendarData, 'dateFormats', numericOverride ? 'short' : 'long'),
    );
    if (pattern === undefined)
        throw new Error(`No date pattern for ${calendar}`);
    const parsed = parseLDMLPattern(pattern, numericOverride);
    const data: CalendarData = { date: parsed.parts };
    if (parsed.monthWidth !== undefined) {
        data.months = monthsFor(calendarData, parsed.monthWidth, calendar);
        validateMonthCoverage(calendar, data.months);
    }
    if (parsed.usesEra) data.eras = erasFor(calendarData, calendar);
    return data;
}

/** The canonical IANA time zone ids from CLDR's bcp47 data: the first alias
 *  of every non-deprecated entry (later aliases are legacy names), excluding
 *  the synthetic Etc/Unknown. This is the committed source of truth for what
 *  Moment/Now consider a valid time zone at edit time (src/locale/timezones.json). */
async function canonicalTimeZones(): Promise<string[]> {
    const entries = at(
        await fetchCLDR('cldr-bcp47/bcp47/timezone.json'),
        'keyword',
        'u',
        'tz',
    );
    if (!isRecord(entries)) throw new Error('No CLDR bcp47 timezone data');
    const zones: string[] = [];
    for (const value of Object.values(entries)) {
        if (!isRecord(value) || value['_deprecated'] === 'true') continue;
        const alias = value['_alias'];
        if (typeof alias !== 'string') continue;
        const canonical = alias.split(' ')[0];
        if (canonical !== 'Etc/Unknown') zones.push(canonical);
    }
    return zones.sort();
}

/** Collect the locale's exemplar city names ('Asia/Tokyo' → 'Tokio') for
 *  canonical zones, walking timeZoneNames.json's per-segment nesting. */
async function exemplarCitiesFor(
    directories: string[],
    canonical: Set<string>,
): Promise<Record<string, string>> {
    let zoneTree: unknown = undefined;
    for (const dir of directories) {
        const json = await fetchCLDR(
            `cldr-dates-full/main/${dir}/timeZoneNames.json`,
        );
        if (json === null) continue;
        zoneTree = at(json, 'main', dir, 'dates', 'timeZoneNames', 'zone');
        if (zoneTree !== undefined) break;
    }
    const cities: Record<string, string> = {};
    const walk = (node: unknown, prefix: string[]) => {
        if (!isRecord(node)) return;
        for (const [key, value] of Object.entries(node)) {
            if (!isRecord(value)) continue;
            const city = value['exemplarCity'];
            if (typeof city === 'string') {
                const zone = [...prefix, key].join('/');
                if (canonical.has(zone)) cities[zone] = city;
            } else walk(value, [...prefix, key]);
        }
    };
    walk(zoneTree, []);
    return cities;
}

/** The locale's default calendar, from CLDR's per-region preferences. */
async function defaultCalendarFor(locale: string): Promise<SupportedCalendar> {
    const preferences = at(
        await fetchCLDR('cldr-core/supplemental/calendarPreferenceData.json'),
        'supplemental',
        'calendarPreferenceData',
    );
    if (!isRecord(preferences))
        throw new Error('No CLDR calendarPreferenceData');
    const region = getLocaleRegions(locale)[0];
    const preferred =
        (region !== undefined ? preferences[region] : undefined) ??
        preferences['001'];
    if (Array.isArray(preferred))
        for (const name of preferred) {
            if (typeof name !== 'string') continue;
            const mapped = PreferenceAliases[name] ?? name;
            if (isSupportedCalendar(mapped)) return mapped;
        }
    return 'gregory';
}

export async function generateDateTimesForLocale(
    locale: string,
): Promise<DateTimeData> {
    const directories = cldrDirectoriesFor(locale);
    const gregorian = await loadCalendar(directories, CalendarSources.gregory);

    // Time pattern, hour cycle, and day period names from the gregorian file.
    const timePattern = patternText(at(gregorian, 'timeFormats', 'medium'));
    if (timePattern === undefined)
        throw new Error(`No medium time pattern for ${locale}`);
    const time = parseLDMLPattern(timePattern, false);
    const am = patternText(
        at(gregorian, 'dayPeriods', 'format', 'abbreviated', 'am'),
    );
    const pm = patternText(
        at(gregorian, 'dayPeriods', 'format', 'abbreviated', 'pm'),
    );

    const calendars: Partial<Record<SupportedCalendar, CalendarData>> = {};
    for (const calendar of SupportedCalendars) {
        try {
            if (calendar === 'iso8601') continue;
            calendars[calendar] = await generateCalendar(
                directories,
                calendar,
            );
        } catch (error) {
            // A calendar CLDR lacks for this locale is omitted; the runtime
            // formatter falls back to a numeric pattern for it.
            console.warn(
                `  ${locale}: skipping calendar ${calendar}: ${String(error)}`,
            );
        }
    }
    // iso8601 has no CLDR data of its own; render it like gregorian.
    const gregory = calendars.gregory;
    if (gregory)
        calendars.iso8601 = JSON.parse(JSON.stringify(gregory));

    const data: DateTimeData = {
        cldr: CLDR_VERSION,
        calendar: await defaultCalendarFor(locale),
        hourCycle: time.hourCycle ?? 'h23',
        time: time.parts,
        calendars,
    };
    if (time.usesDayPeriod && am !== undefined && pm !== undefined)
        data.dayPeriods = { am, pm };
    const zones = await exemplarCitiesFor(
        directories,
        new Set(await canonicalTimeZones()),
    );
    if (Object.keys(zones).length > 0) data.zones = zones;
    return data;
}

/** Where a locale's full data file lives: en-US is bundled with the app (like
 *  src/locale/en-US.json); other locales are fetched from static. */
export function dateTimesPathFor(locale: string): string {
    return locale === 'en-US'
        ? path.join('src', 'locale', 'en-US-datetimes.json')
        : path.join('static', 'locales', locale, `${locale}-datetimes.json`);
}

/** The bundled "core" slice of a locale's data: its patterns and its default
 *  calendar only. Bundling this for every locale keeps `→ ''/language` targets
 *  working for locales the reader hasn't selected (whose full lazy data file
 *  isn't loaded), at a fraction of the size of the full data. */
export function coreOf(data: DateTimeData): DateTimeData {
    const calendars: DateTimeData['calendars'] = {};
    const defaultCalendar = data.calendars[data.calendar];
    if (defaultCalendar) calendars[data.calendar] = defaultCalendar;
    // City names are for time zone suggestions, not formatting; keep the
    // always-bundled core small by leaving them to the lazy full files.
    const core = { ...data, calendars };
    delete core.zones;
    return core;
}

/** Read a committed full data file, or undefined if missing/unparsable. */
export function readDateTimesFor(locale: string): DateTimeData | undefined {
    const file = dateTimesPathFor(locale);
    if (!existsSync(file)) return undefined;
    try {
        return JSON.parse(readFileSync(file, 'utf8'));
    } catch (_) {
        return undefined;
    }
}

/** Rebuild src/locale/datetimes-core.json purely from the committed full data
 *  files on disk (no network), so the core can never drift from them and the
 *  verifier can check consistency offline. en-US is excluded: its full data is
 *  always bundled. Returns the locales whose full files were missing. */
export async function rebuildDateTimesCore(): Promise<string[]> {
    const core: Record<string, DateTimeData> = {};
    const missing: string[] = [];
    for (const locale of SupportedLocales) {
        if (locale === 'en-US') continue;
        const data = readDateTimesFor(locale);
        if (data === undefined) missing.push(locale);
        else core[locale] = coreOf(data);
    }
    await writeFormatted(
        path.join('src', 'locale', 'datetimes-core.json'),
        JSON.stringify(core),
    );
    return missing;
}

/** Generate and write the committed canonical time zone list. */
export async function writeTimeZones(): Promise<void> {
    await writeFormatted(
        path.join('src', 'locale', 'timezones.json'),
        JSON.stringify({
            cldr: CLDR_VERSION,
            zones: await canonicalTimeZones(),
        }),
    );
}

/** Generate and write one locale's full data file. */
export async function writeDateTimesForLocale(locale: string): Promise<void> {
    const data = await generateDateTimesForLocale(locale);
    const file = dateTimesPathFor(locale);
    const dir = path.dirname(file);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    await writeFormatted(file, JSON.stringify(data));
}

async function main(): Promise<void> {
    const only = process.argv[2];
    const locales = only ? [only] : SupportedLocales;
    console.log(
        `Generating date/time data for ${locales.length} locale(s) from CLDR ${CLDR_VERSION}…`,
    );
    for (const locale of locales) {
        await writeDateTimesForLocale(locale);
        console.log(`  ${locale}`);
    }
    const missing = await rebuildDateTimesCore();
    if (missing.length > 0)
        console.warn(
            `Core is missing locales without full data files: ${missing.join(', ')}`,
        );
    // The canonical zone list only changes with CLDR_VERSION; write it on
    // full runs only, so a single-locale run stays cheap.
    if (only === undefined) await writeTimeZones();
    console.log('Done.');
}

// Run only when invoked directly, so the verifier can import the helpers
// without kicking off a full run.
if (process.argv[1]?.endsWith('generateDateTimes.ts'))
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
