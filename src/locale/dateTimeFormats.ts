import type Locale from '@locale/Locale';
import { substituteDigitsForLocale } from '@locale/numberFormats';

/**
 * Deterministic, in-repo date and time formatting for Moment values. As with
 * number formatting (see numberFormats.ts), we deliberately do NOT call
 * Intl.DateTimeFormat at runtime: its ICU/CLDR data varies across browsers and
 * OS versions, so the same Wordplay program could render dates differently on
 * different machines. Instead, `npm run datetimes` extracts patterns, month
 * names, and era names from a PINNED Unicode CLDR JSON release (independent of
 * the developer's Node/ICU — see generateDateTimes.ts) into committed
 * per-locale data files (static/locales/<locale>/<locale>-datetimes.json),
 * and this module assembles text from that data plus Temporal-derived fields.
 */

/** The Unicode calendar identifiers Moment and Now support: everything ICU
 *  implements. Kept as an explicit committed list (not Intl.supportedValuesOf)
 *  so the set is identical in every environment. */
export type SupportedCalendar =
    | 'buddhist'
    | 'chinese'
    | 'coptic'
    | 'dangi'
    | 'ethioaa'
    | 'ethiopic'
    | 'gregory'
    | 'hebrew'
    | 'indian'
    | 'islamic-civil'
    | 'islamic-tbla'
    | 'islamic-umalqura'
    | 'iso8601'
    | 'japanese'
    | 'persian'
    | 'roc';

export const SupportedCalendars: SupportedCalendar[] = [
    'buddhist',
    'chinese',
    'coptic',
    'dangi',
    'ethioaa',
    'ethiopic',
    'gregory',
    'hebrew',
    'indian',
    'islamic-civil',
    'islamic-tbla',
    'islamic-umalqura',
    'iso8601',
    'japanese',
    'persian',
    'roc',
];

export function isSupportedCalendar(text: string): text is SupportedCalendar {
    return SupportedCalendars.some((calendar) => calendar === text);
}

/** A field slot in a date or time pattern. `monthName` renders the localized
 *  month name by stable month code; `month` renders the month number.
 *  `relatedYear` is the Gregorian year shown alongside lunisolar dates
 *  (e.g. Chinese). `p` means zero-pad to two digits. */
export type DateTimeField =
    | 'year'
    | 'relatedYear'
    | 'month'
    | 'monthName'
    | 'day'
    | 'era'
    | 'hour'
    | 'minute'
    | 'second'
    | 'dayPeriod';

export type DateTimePart = { l: string } | { f: DateTimeField; p?: boolean };

export type CalendarData = {
    /** The locale's long-style date pattern for this calendar. */
    date: DateTimePart[];
    /** Localized month names in pattern context, keyed by stable monthCode
     *  (M01…M13, M05L, …). Absent when the pattern shows numeric months. */
    months?: Record<string, string>;
    /** Localized era names keyed by Temporal era code, for patterns that
     *  display an era (e.g. Japanese 令和, Ethiopic ዓ/ም). */
    eras?: Record<string, string>;
};

export type DateTimeData = {
    /** The CLDR release the data was extracted from (provenance; see generateDateTimes.ts). */
    cldr?: string;
    /** The locale's default calendar (used when a Moment leaves calendar unset). */
    calendar: SupportedCalendar;
    /** The locale's clock convention, from CLDR. */
    hourCycle: 'h11' | 'h12' | 'h23' | 'h24';
    /** Localized day period names, when the hour cycle uses them. */
    dayPeriods?: { am: string; pm: string };
    /** The locale's medium-style time pattern. */
    time: DateTimePart[];
    /** Per-calendar date patterns and names. */
    calendars: Partial<Record<SupportedCalendar, CalendarData>>;
    /** Localized exemplar city names keyed by IANA time zone id (e.g.
     *  'Asia/Tokyo' → 'Tokio' in es), for time zone suggestions. Only zones
     *  CLDR localizes for this locale; others fall back to the id's city
     *  segment. Stripped from the bundled core to keep it small. */
    zones?: Record<string, string>;
};

/** The calendar-relative field values of a moment, as derived from a
 *  Temporal.ZonedDateTime. Plain data so formatting is testable without Temporal. */
export type DateTimeFields = {
    era?: string;
    eraYear?: number;
    year: number;
    /** The ISO (Gregorian) year, for lunisolar `relatedYear` slots. */
    relatedISOYear: number;
    monthCode: string;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};

/** Render a number in the locale's digits, optionally zero-padded to 2. Years
 *  and other date fields are never grouped, so this bypasses number grouping. */
function digits(value: number, locale: Locale, pad: boolean | undefined) {
    const text = String(value);
    return substituteDigitsForLocale(
        pad === true ? text.padStart(2, '0') : text,
        locale,
    );
}

/** Convert a 0–23 hour to the display hour for the given cycle. */
function displayHour(hour: number, cycle: DateTimeData['hourCycle']): number {
    switch (cycle) {
        case 'h23':
            return hour;
        case 'h24':
            return hour === 0 ? 24 : hour;
        case 'h11':
            return hour % 12;
        case 'h12':
            return ((hour + 11) % 12) + 1;
    }
}

function renderParts(
    parts: DateTimePart[],
    fields: DateTimeFields,
    calendarData: CalendarData | undefined,
    data: DateTimeData,
    locale: Locale,
): string {
    let text = '';
    for (const part of parts) {
        if ('l' in part) {
            text += part.l;
            continue;
        }
        switch (part.f) {
            case 'year':
                text += digits(fields.eraYear ?? fields.year, locale, part.p);
                break;
            case 'relatedYear':
                text += digits(fields.relatedISOYear, locale, part.p);
                break;
            case 'monthName':
                text +=
                    calendarData?.months?.[fields.monthCode] ??
                    digits(fields.month, locale, part.p);
                break;
            case 'month':
                text += digits(fields.month, locale, part.p);
                break;
            case 'day':
                text += digits(fields.day, locale, part.p);
                break;
            case 'era':
                // Some calendars have no era for some dates; render nothing then.
                if (fields.era !== undefined)
                    text +=
                        calendarData?.eras?.[fields.era] ?? fields.era;
                break;
            case 'hour':
                text += digits(
                    displayHour(fields.hour, data.hourCycle),
                    locale,
                    part.p,
                );
                break;
            case 'minute':
                text += digits(fields.minute, locale, part.p);
                break;
            case 'second':
                text += digits(fields.second, locale, part.p);
                break;
            case 'dayPeriod':
                if (data.dayPeriods)
                    text +=
                        fields.hour < 12
                            ? data.dayPeriods.am
                            : data.dayPeriods.pm;
                break;
        }
    }
    return text;
}

/** A last-resort numeric pattern for a calendar the data file lacks. */
const FallbackDate: DateTimePart[] = [
    { f: 'year' },
    { l: '-' },
    { f: 'month', p: true },
    { l: '-' },
    { f: 'day', p: true },
];

/**
 * Format a moment's fields per the locale's conventions for the given calendar.
 * `date`/`time` select which halves to render; both are joined with a space.
 */
export function formatDateTimeForLocale(
    fields: DateTimeFields,
    calendar: SupportedCalendar,
    data: DateTimeData,
    locale: Locale,
    options: { date: boolean; time: boolean },
): string {
    const calendarData = data.calendars[calendar];
    const segments: string[] = [];
    if (options.date)
        segments.push(
            renderParts(
                calendarData?.date ?? FallbackDate,
                fields,
                calendarData,
                data,
                locale,
            ).trim(),
        );
    if (options.time)
        segments.push(
            renderParts(data.time, fields, calendarData, data, locale).trim(),
        );
    return segments.join(' ');
}
