import { describe, expect, test } from 'vitest';
import { AgesOfConsent } from './ageOfConsent.js';
import {
    ReviewIntervalMonths,
    reviewIssueBody,
    reviewIssueTitle,
    staleAgesOfConsent,
} from './reviewAgesOfConsent.js';

const at = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

// The table's rows were all checked on this date.
const CHECKED = '2026-09-04';

describe('deciding what has gone stale', () => {
    test('nothing has aged the day after it was checked', () => {
        // Only the rows flagged uncertain should appear.
        const rows = staleAgesOfConsent(at('2026-09-05'));
        expect(rows.every((r) => r.reason === 'uncertain')).toBe(true);
        expect(rows.length).toBeGreaterThan(0);
    });

    test('an uncertain row is listed immediately, without waiting a year', () => {
        // The contested readings are the ones most likely to be wrong now, so
        // they don't get to wait for the interval to elapse.
        const rows = staleAgesOfConsent(at('2026-09-05'));
        expect(rows.map((r) => r.region)).toContain('AU');
        expect(rows.map((r) => r.region)).toContain('IN');
    });

    test(`every row ages after ${ReviewIntervalMonths} months`, () => {
        const rows = staleAgesOfConsent(at('2027-09-05'));
        expect(rows.length).toBe(Object.keys(AgesOfConsent).length);
        expect(rows.every((r) => r.reason === 'aged')).toBe(true);
    });

    test('the interval boundary is inclusive', () => {
        // Exactly a year later counts as due, rather than a day later.
        expect(
            staleAgesOfConsent(at('2027-09-04')).every(
                (r) => r.reason === 'aged',
            ),
        ).toBe(true);
        expect(
            staleAgesOfConsent(at('2027-09-03')).some(
                (r) => r.reason === 'aged',
            ),
        ).toBe(false);
    });

    test('rows come back oldest first', () => {
        const rows = staleAgesOfConsent(at('2028-01-01'));
        const checked = rows.map((r) => r.checked);
        expect(checked).toEqual([...checked].sort());
    });

    test('the table is all checked on the same date today', () => {
        // Guards the fixtures above: if a row is re-checked later, these dates
        // move and the boundary tests would silently stop testing the boundary.
        for (const [region, entry] of Object.entries(AgesOfConsent))
            expect(entry.checked, region).toBe(CHECKED);
    });
});

describe('the issue it opens', () => {
    test('the title carries the year, so a retry dedupes but next year does not', () => {
        expect(reviewIssueTitle(at('2027-01-01'))).toBe(
            'Review the age-of-consent table (2027)',
        );
        expect(reviewIssueTitle(at('2027-06-30'))).toBe(
            reviewIssueTitle(at('2027-01-01')),
        );
        expect(reviewIssueTitle(at('2028-01-01'))).not.toBe(
            reviewIssueTitle(at('2027-01-01')),
        );
    });

    test('the body names every stale row and why', () => {
        const now = at('2027-09-05');
        const rows = staleAgesOfConsent(now);
        const body = reviewIssueBody(rows, now);
        for (const region of Object.keys(AgesOfConsent))
            expect(body, region).toContain(`| ${region} |`);
        expect(body).toContain('functions/src/ageOfConsent.ts');
    });

    test('the body explains the uncertain rows in words', () => {
        const now = at('2026-09-05');
        const body = reviewIssueBody(staleAgesOfConsent(now), now);
        expect(body).toContain('Flagged uncertain');
        // The reason, not just the code, or the reader has to go read the file.
        expect(body).toContain('age-restricted social media platforms');
    });

    test('the body asks about regions that have no row at all', () => {
        // The table is exceptions only, so a country that newly raised its age
        // has nothing to go stale — the easiest way for this to silently rot.
        const now = at('2027-09-05');
        const body = reviewIssueBody(staleAgesOfConsent(now), now);
        expect(body).toContain('has no row to go stale');
    });
});
