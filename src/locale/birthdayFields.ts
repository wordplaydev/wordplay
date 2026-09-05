import { getDateTimeDataForLocale } from '@locale/dateTimeData';
import { formatDateTimeForLocale } from '@locale/dateTimeFormats';
import type Locale from '@locale/Locale';
import { substituteDigitsForLocale } from '@locale/numberFormats';

/**
 * How to present a birthday for entry, in the reader's own conventions (#628).
 *
 * A birthday is asked as three fields rather than `<input type="date">`,
 * because the native picker's chrome is untranslated and its accessible
 * labelling varies by engine. Three fields then have to be in the *right order*
 * — `en-US` writes M/D/Y, most of the world D/M/Y, and `ja-JP` Y/M/D — and the
 * order has to come from somewhere.
 *
 * That somewhere is the data [dateTimeFormats.ts](src/locale/dateTimeFormats.ts)
 * already ships: patterns and month names extracted from a *pinned* CLDR
 * release, precisely so formatting doesn't vary with the browser's own ICU
 * build. A birthday reads the way every other date in Wordplay does, and
 * identically on every machine.
 *
 * Gregorian only. Fifteen calendars are supported for `Moment`, but every
 * statute in the age-of-consent table is written in Gregorian years, so
 * converting would introduce error rather than remove it.
 *
 * The order follows the *reader's locale*, not the region they picked in the
 * join flow: the region answers a legal question, not a calendar one, and a
 * reader who chose Japanese should see Y/M/D whichever country they live in.
 */

export type BirthdayField = 'year' | 'month' | 'day';

/** Unambiguous, and what a locale whose pattern we can't read falls back to. */
const ISOOrder: BirthdayField[] = ['year', 'month', 'day'];

/** The order this locale writes a date in. */
export function birthdayFieldOrder(locale: Locale): BirthdayField[] {
    const pattern = getDateTimeDataForLocale(locale).calendars.gregory?.date;
    if (pattern === undefined) return ISOOrder;
    const order: BirthdayField[] = [];
    for (const part of pattern) {
        if (!('f' in part)) continue;
        // A pattern may show the month as a name or a number; either way it is
        // the month field, and only its position matters here.
        const field =
            part.f === 'monthName'
                ? 'month'
                : part.f === 'year' || part.f === 'month' || part.f === 'day'
                  ? part.f
                  : undefined;
        if (field !== undefined && !order.includes(field)) order.push(field);
    }
    // A pattern that doesn't name all three (an era-only or year-only form)
    // can't tell us an order for the fields we need.
    return order.length === 3 ? order : ISOOrder;
}

/**
 * The locale's month names, January first, or undefined when it writes months
 * as numbers — which several do, and where inventing names would be worse than
 * showing the numerals they expect.
 */
export function birthdayMonthNames(locale: Locale): string[] | undefined {
    const months = getDateTimeDataForLocale(locale).calendars.gregory?.months;
    if (months === undefined) return undefined;
    const names: string[] = [];
    for (let month = 1; month <= 12; month++) {
        const name = months[`M${String(month).padStart(2, '0')}`];
        // A partial table is not usable: half-named months would read as a bug.
        if (name === undefined) return undefined;
        names.push(name);
    }
    return names;
}

/** A number in the locale's own digits, for the year and day fields. */
export function birthdayNumber(value: number, locale: Locale): string {
    return substituteDigitsForLocale(String(value), locale);
}

/** Whether the three parts name a real calendar date. Strict rather than
 *  lenient: `Date.parse` accepts '2016-02-31' and rolls it forward, turning a
 *  typo into a birthday a couple of days off. */
export function isRealDate(year: number, month: number, day: number): boolean {
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

/** The ISO form joinAccount takes. */
export function toISODate(year: number, month: number, day: number): string {
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * A date written the way this locale writes dates — same pinned CLDR patterns
 * and month names the fields above are ordered by, so it reads like every other
 * date in Wordplay and identically on every machine.
 *
 * Used for the day someone becomes old enough to hold an email address. Naming
 * the day is kinder than "when you're older": it answers the question instead
 * of deferring it, and it is a date the creator can check for themselves.
 */
export function formatDate(when: number, locale: Locale): string {
    const date = new Date(when);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    return formatDateTimeForLocale(
        {
            year,
            relatedISOYear: year,
            monthCode: `M${String(month).padStart(2, '0')}`,
            month,
            day: date.getUTCDate(),
            // The eligibility date is a day, not a moment; the time half is
            // never rendered.
            hour: 0,
            minute: 0,
            second: 0,
        },
        'gregory',
        getDateTimeDataForLocale(locale),
        locale,
        { date: true, time: false },
    );
}
