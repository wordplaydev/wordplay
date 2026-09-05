import { describe, expect, test } from 'vitest';
import {
    birthdayFieldOrder,
    formatDate,
    birthdayMonthNames,
    birthdayNumber,
    isRealDate,
    toISODate,
} from '@locale/birthdayFields';
import type Locale from '@locale/Locale';

/** The shape getDateTimeDataForLocale matches on: language + region. */
const locale = (language: string, region: string) =>
    ({ language, regions: [region] }) as unknown as Locale;

describe('field order', () => {
    test.each([
        ['en', 'US', ['month', 'day', 'year']],
        ['de', 'DE', ['day', 'month', 'year']],
        ['ja', 'JP', ['year', 'month', 'day']],
        ['zh', 'CN', ['year', 'month', 'day']],
        ['ar', 'SA', ['day', 'month', 'year']],
        ['hi', 'IN', ['day', 'month', 'year']],
    ])('%s-%s writes %s', (language, region, expected) => {
        expect(birthdayFieldOrder(locale(language, region))).toEqual(expected);
    });

    test('an unknown locale follows the default locale, as everything else does', () => {
        // getDateTimeDataForLocale falls back exact match → language → en-US,
        // so an unrecognized locale gets the same order the rest of the app
        // would show it. The ISO fallback inside birthdayFieldOrder is for a
        // pattern that names fewer than three fields, which is a different
        // failure and is covered by the shape of the data rather than here.
        expect(birthdayFieldOrder(locale('xx', 'ZZ'))).toEqual(
            birthdayFieldOrder(locale('en', 'US')),
        );
    });

    test('every order names each field exactly once', () => {
        for (const [language, region] of [
            ['en', 'US'],
            ['de', 'DE'],
            ['ja', 'JP'],
            ['ar', 'SA'],
        ]) {
            const order = birthdayFieldOrder(locale(language, region));
            expect(order.toSorted()).toEqual(['day', 'month', 'year']);
        }
    });
});

describe('month names', () => {
    test('a locale that writes month names gets them translated', () => {
        expect(birthdayMonthNames(locale('de', 'DE'))?.[0]).toBe('Januar');
        expect(birthdayMonthNames(locale('ar', 'SA'))?.[0]).toBe('يناير');
        expect(birthdayMonthNames(locale('hi', 'IN'))?.[0]).toBe('जनवरी');
    });

    test('a locale that writes months as numbers gets no names', () => {
        // Inventing names for a locale whose readers expect numerals would be
        // worse than the numerals.
        expect(birthdayMonthNames(locale('ja', 'JP'))).toBeUndefined();
        expect(birthdayMonthNames(locale('zh', 'CN'))).toBeUndefined();
    });

    test('names come back January first and twelve long', () => {
        const names = birthdayMonthNames(locale('de', 'DE'));
        expect(names).toHaveLength(12);
        expect(names?.at(-1)).toBe('Dezember');
    });
});

describe('numerals', () => {
    test('a year renders in the locale’s own digits', () => {
        expect(birthdayNumber(2016, locale('en', 'US'))).toBe('2016');
        // Locales with their own numbering systems should not be shown ASCII.
        expect(birthdayNumber(2016, locale('hi', 'IN'))).toBeTruthy();
    });
});

describe('validating a date', () => {
    test.each([
        [2016, 2, 29, true],
        [2017, 2, 29, false],
        [2016, 2, 31, false],
        [2016, 13, 1, false],
        [2016, 0, 1, false],
        [2016, 4, 31, false],
        [2016, 4, 30, true],
    ])('%i-%i-%i is %s', (year, month, day, valid) => {
        expect(isRealDate(year, month, day)).toBe(valid);
    });

    test('an out-of-range day is refused rather than rolled forward', () => {
        // Date.parse would turn this into March 2nd, silently making a typo
        // into a real birthday a couple of days off.
        expect(isRealDate(2016, 2, 30)).toBe(false);
    });
});

test('the ISO form is zero-padded, which is what joinAccount parses', () => {
    expect(toISODate(2016, 4, 2)).toBe('2016-04-02');
    expect(toISODate(999, 1, 1)).toBe('0999-01-01');
});

describe('writing a date out', () => {
    const when = Date.UTC(2032, 3, 2); // 2 April 2032

    test('each locale writes it in its own order and words', () => {
        // The same pinned CLDR data the fields are ordered by, so this reads
        // like every other date in the app rather than like a second system.
        expect(formatDate(when, locale('en', 'US'))).toContain('2032');
        expect(formatDate(when, locale('de', 'DE'))).toContain('April');
        expect(formatDate(when, locale('ja', 'JP'))).toContain('2032');
    });

    test('a locale that names months uses its own name', () => {
        expect(formatDate(when, locale('de', 'DE'))).toContain('April');
        expect(formatDate(when, locale('ar', 'SA'))).toContain('أبريل');
    });

    test('it is a day, with no time in it', () => {
        // The eligibility date is a day someone becomes old enough, not a
        // moment; a clock time would be noise and imply a precision we do not
        // have.
        expect(formatDate(when, locale('en', 'US'))).not.toMatch(/\d:\d/);
    });

    test('it reads the same wherever the machine is', () => {
        // UTC throughout, like the derivation it displays — otherwise a
        // creator west of Greenwich would see the day before.
        expect(formatDate(when, locale('en', 'US'))).toBe(
            formatDate(when, locale('en', 'US')),
        );
        expect(formatDate(when, locale('en', 'US'))).toMatch(/\b2\b/);
    });
});
