import { expect, test } from 'vitest';
import {
    getDateTimeDataForLocale,
    registerDateTimeData,
} from '@locale/dateTimeData';
import {
    formatDateTimeForLocale,
    type DateTimeFields,
} from '@locale/dateTimeFormats';
import type Locale from '@locale/Locale';

const English: Locale = { language: 'en', regions: ['US'] };
const Hindi: Locale = { language: 'hi', regions: ['IN'] };
const Japanese: Locale = { language: 'ja', regions: ['JP'] };

const JulyFirst: DateTimeFields = {
    year: 2026,
    relatedISOYear: 2026,
    monthCode: 'M07',
    month: 7,
    day: 1,
    hour: 15,
    minute: 30,
    second: 5,
};

test('en-US formats from the bundled data', () => {
    const data = getDateTimeDataForLocale(English);
    expect(
        formatDateTimeForLocale(JulyFirst, 'gregory', data, English, {
            date: true,
            time: false,
        }),
    ).toBe('July 1, 2026');
    // h12 hour conversion, padded minutes/seconds, day period.
    expect(
        formatDateTimeForLocale(JulyFirst, 'gregory', data, English, {
            date: false,
            time: true,
        }),
    ).toBe('3:30:05 PM');
});

test('Supported locales format from the bundled core data', () => {
    // ja-JP isn't "loaded", but its core (patterns + default calendar) is bundled.
    const data = getDateTimeDataForLocale(Japanese);
    expect(
        formatDateTimeForLocale(JulyFirst, 'gregory', data, Japanese, {
            date: true,
            time: false,
        }),
    ).toBe('2026年7月1日');
});

test('Unsupported languages fall back to en-US data', () => {
    const thai: Locale = { language: 'th', regions: [] };
    const data = getDateTimeDataForLocale(thai);
    // Patterns and names fall back to en-US, but digits still follow the
    // target locale's script, consistent with number output.
    expect(
        formatDateTimeForLocale(JulyFirst, 'gregory', data, thai, {
            date: true,
            time: false,
        }),
    ).toBe('July ๑, ๒๐๒๖');
});

test('Registered locale data drives field order, names, and digits', () => {
    // A distilled ja-JP shape: year-month-day with numeric fields.
    registerDateTimeData('ja-JP', {
        calendar: 'gregory',
        hourCycle: 'h23',
        time: [
            { f: 'hour' },
            { l: ':' },
            { f: 'minute', p: true },
            { l: ':' },
            { f: 'second', p: true },
        ],
        calendars: {
            gregory: {
                date: [
                    { f: 'year' },
                    { l: '年' },
                    { f: 'month' },
                    { l: '月' },
                    { f: 'day' },
                    { l: '日' },
                ],
            },
        },
    });
    const data = getDateTimeDataForLocale(Japanese);
    expect(
        formatDateTimeForLocale(JulyFirst, 'gregory', data, Japanese, {
            date: true,
            time: true,
        }),
    ).toBe('2026年7月1日 15:30:05');
});

test('Digit substitution renders native numerals without grouping', () => {
    registerDateTimeData('hi-IN', {
        calendar: 'gregory',
        hourCycle: 'h12',
        dayPeriods: { am: 'am', pm: 'pm' },
        time: [
            { f: 'hour' },
            { l: ':' },
            { f: 'minute', p: true },
            { l: ' ' },
            { f: 'dayPeriod' },
        ],
        calendars: {
            gregory: {
                date: [
                    { f: 'day' },
                    { l: ' ' },
                    { f: 'monthName' },
                    { l: ' ' },
                    { f: 'year' },
                ],
                months: { M07: 'जुलाई' },
            },
        },
    });
    const data = getDateTimeDataForLocale(Hindi);
    // The year is four Devanagari digits with no grouping separator.
    expect(
        formatDateTimeForLocale(JulyFirst, 'gregory', data, Hindi, {
            date: true,
            time: true,
        }),
    ).toBe('१ जुलाई २०२६ ३:३० pm');
});

test('Era names render from era codes when the pattern shows them', () => {
    const data = getDateTimeDataForLocale(English);
    const reiwa: DateTimeFields = {
        ...JulyFirst,
        era: 'reiwa',
        eraYear: 8,
        year: 2026,
    };
    expect(
        formatDateTimeForLocale(reiwa, 'japanese', data, English, {
            date: true,
            time: false,
        }),
    ).toBe('July 1, 8 Reiwa');
});
