import { expect, test } from 'vitest';
import { Regions } from '@locale/Regions';
import * as server from '../../../functions/src/ageOfConsent';
import * as client from './ageOfConsent';

/**
 * The ages exist twice: the server decides eligibility, and the client branches
 * the join form as the birthday is typed. A drift is silent and lands on a
 * child — the form would offer an email account the callable then refuses, or
 * withhold one they were entitled to, and neither says why.
 *
 * Compared across every ISO region rather than the listed ones, so a row
 * deleted on one side is caught as well as a row changed.
 */

test('both copies give the same age for every region', () => {
    for (const region of Object.keys(Regions))
        expect(client.ageOfConsent(region), region).toBe(
            server.ageOfConsent(region),
        );
});

test('both copies agree on the default', () => {
    expect(client.DefaultAgeOfConsent).toBe(server.DefaultAgeOfConsent);
    expect(client.ageOfConsent('ZZ')).toBe(server.ageOfConsent('ZZ'));
});

test('the two tables list exactly the same regions', () => {
    expect(Object.keys(client.AgesOfConsent).toSorted()).toEqual(
        Object.keys(server.AgesOfConsent).toSorted(),
    );
});

test('provenance lives only on the server copy', () => {
    // The client carries bare numbers on purpose. If it grew a source field,
    // there would be two places to update when a law changes, and the one
    // nobody remembers is the one that goes stale.
    for (const value of Object.values(client.AgesOfConsent))
        expect(typeof value).toBe('number');
});
