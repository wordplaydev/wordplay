import { describe, expect, test } from 'vitest';
import { Regions } from '@locale/Regions';
import {
    AgesOfConsent,
    AgeOfConsentReviewed,
    ageOfConsent,
    emailEligibleOn,
} from '../../../functions/src/ageOfConsent';

const on = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const NOW = on('2026-09-04');

describe('the table', () => {
    test('every region code is a real ISO 3166 code', () => {
        // A typo'd code is silent: it never matches, so that country quietly
        // gets the default instead of its own law.
        for (const code of Object.keys(AgesOfConsent))
            expect(Regions, code).toHaveProperty(code);
    });

    test('every age is within the range these instruments use', () => {
        for (const [code, entry] of Object.entries(AgesOfConsent)) {
            expect(entry.age, code).toBeGreaterThanOrEqual(13);
            expect(entry.age, code).toBeLessThanOrEqual(18);
        }
    });

    test('every row carries a source and a checked date', () => {
        // Provenance is the whole point of this file: a bare number can't be
        // reviewed a year from now, because nobody remembers where it came from.
        for (const [code, entry] of Object.entries(AgesOfConsent)) {
            expect(entry.source, code).toBeTruthy();
            expect(entry.checked, code).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
    });

    test('no row merely restates the default', () => {
        // The table is the exceptions. A row equal to the default is either a
        // mistake or a law that changed and was half-updated.
        for (const [code, entry] of Object.entries(AgesOfConsent))
            expect(entry.age, code).not.toBe(13);
    });

    test('the review date is a date', () => {
        expect(AgeOfConsentReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});

describe('looking up an age', () => {
    test.each([
        ['US', 13, 'COPPA, and the default'],
        ['GB', 13, 'UK GDPR, equal to the default'],
        ['DE', 16, 'the Article 8 default'],
        ['FR', 15, 'lowered by statute'],
        ['ES', 14, 'lowered by statute'],
        ['AU', 16, ''],
        ['BR', 16, ''],
        ['IN', 18, 'the strictest anywhere'],
        ['ZZ', 13, 'an unknown region falls back'],
    ])('%s is %i', (region, age) => {
        expect(ageOfConsent(region)).toBe(age);
    });
});

describe('deriving the eligibility date', () => {
    test('a 13-year-old in the US is eligible on their 13th birthday', () => {
        expect(emailEligibleOn('2016-04-02', 'US', NOW)).toBe(on('2029-04-02'));
    });

    test('the same birthday in Germany waits three more years', () => {
        // The point of the table: same person, same day, different answer.
        expect(emailEligibleOn('2016-04-02', 'DE', NOW)).toBe(on('2032-04-02'));
    });

    test.each([
        ['AU', '2032-04-02'],
        ['BR', '2032-04-02'],
        ['IN', '2034-04-02'],
        ['KR', '2030-04-02'],
    ])('%s resolves to %s', (region, expected) => {
        expect(emailEligibleOn('2016-04-02', region, NOW)).toBe(on(expected));
    });

    test('a February 29th birthday lands on March 1st', () => {
        // 2016 + 13 = 2029, which is not a leap year. Rolling forward rather
        // than back is the later of the two readings, so it is the cautious one.
        expect(emailEligibleOn('2016-02-29', 'US', NOW)).toBe(on('2029-03-01'));
    });

    test('a February 29th birthday keeps the day in a leap year', () => {
        // 2016 + 16 = 2032, which is a leap year, so no rolling happens.
        expect(emailEligibleOn('2016-02-29', 'DE', NOW)).toBe(on('2032-02-29'));
    });

    test('someone already old enough gets a date in the past', () => {
        // The caller compares against now; the derivation doesn't clamp, so
        // "already eligible" and "eligible later" are the same computation.
        const when = emailEligibleOn('1990-01-01', 'US', NOW);
        expect(when).toBe(on('2003-01-01'));
        expect(when).toBeLessThan(NOW);
    });

    test.each([
        ['2016-02-31', 'not a real day'],
        ['2016-13-01', 'not a real month'],
        ['16-02-01', 'not a four-digit year'],
        ['2016-2-1', 'not zero-padded'],
        ['', 'empty'],
        ['tomorrow', 'not a date at all'],
        ['2030-01-01', 'in the future'],
        ['1800-01-01', 'implausibly long ago'],
    ])('%s is refused: %s', (birthdate) => {
        expect(emailEligibleOn(birthdate, 'US', NOW)).toBeUndefined();
    });

    test('the result never depends on the machine’s time zone', () => {
        // Computed in UTC throughout, so a server in Auckland and one in
        // Honolulu derive the same eligibility date from the same birthday.
        const when = emailEligibleOn('2016-04-02', 'US', NOW);
        expect(new Date(when ?? 0).toISOString()).toBe(
            '2029-04-02T00:00:00.000Z',
        );
    });
});
